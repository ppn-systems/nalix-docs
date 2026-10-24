import { describe, expect, it } from 'vitest';
import { buildApiIndex, diffSurfaces, fileSurface, memberName, scanFile } from '../scripts/api-index.mjs';

const surface = (src: string) => fileSurface('src/Nalix.X/A.cs', src).map((e: { signature: string }) => e.signature);

describe('API index — type discovery', () => {
  it('indexes public types and ignores internal types and types nested in internal ones', () => {
    const src = `
namespace Nalix.X;
public sealed class Open { public sealed class Inner { } private class Hidden { } }
internal class Closed { public class Leaked { } }
public readonly record struct Point(int X, int Y);
public sealed class Marker : Attribute;
public interface IThing { }
public enum Mode : byte { A, B }`;
    const { declarations } = scanFile('src/Nalix.X/A.cs', src);
    const api = declarations.filter((d: { api: boolean }) => d.api).map((d: { name: string }) => d.name).sort();
    expect(api).toEqual(['IThing', 'Inner', 'Marker', 'Mode', 'Open', 'Point']);
  });

  it('is not confused by braces and keywords inside strings, comments or generic constraints', () => {
    const src = `
namespace Nalix.X;
public sealed class A<T> where T : class
{
    // class Fake { }
    private string s = "} class Nope {";
    private string t = $"{(x ? "{" : "}")}";
    /* public class AlsoFake */
    public int V { get; set; }
}
public sealed class B { }`;
    const { declarations } = scanFile('src/Nalix.X/A.cs', src);
    expect(declarations.filter((d: { api: boolean }) => d.api).map((d: { name: string }) => d.name).sort()).toEqual(['A', 'B']);
  });

  it('collects options properties with defaults and enum members (skipping #region lines)', () => {
    const idx = buildApiIndex([
      {
        path: 'src/Nalix.X/FooOptions.cs',
        text: `namespace Nalix.X.Options;
public sealed class FooOptions
{
    [ValueRange(1, int.MaxValue)]
    public int Max { get; set; } = 2_000;
    public TimeSpan Wait { get; set; } = TimeSpan.FromSeconds(20);
    public static int Shared { get; set; } = 1;
}
public enum Kind : byte
{
    #region 0-9: General
    NONE = 0,
    Other = 1,
}`,
      },
    ]);
    expect(idx.options.FooOptions.properties).toEqual([
      { name: 'Max', type: 'int', default: '2_000' },
      { name: 'Wait', type: 'TimeSpan', default: 'TimeSpan.FromSeconds(20)' },
    ]);
    expect(idx.enums.Kind.members).toEqual(['NONE', 'Other']);
    expect(idx.namespaces).toContain('Nalix.X.Options');
  });
});

describe('API index — member signatures', () => {
  it('captures accessors and defaults but not method bodies', () => {
    const sigs = surface(`namespace N;
public sealed class A
{
    [Obsolete("x")]
    public int Count { get; private set; } = 5;
    public int Calc(int a) { return a + 1; }
    public int Expr(int a) => a * 2;
    private int hidden;
    protected virtual void Hook() { }
    public A(int x) : this(x, 0) { }
    public A(int x, int y) { }
    public event EventHandler Changed;
}`);
    expect(sigs).toEqual([
      '<sealed class>',
      'public int Count {get;privateset;} = 5',
      'public int Calc(int a)',
      'public int Expr(int a)',
      'protected virtual void Hook()',
      'public A(int x)',
      'public A(int x, int y)',
      'public event EventHandler Changed',
    ]);
  });

  it('treats every interface member as public and keeps enum values', () => {
    expect(surface('namespace N; public interface I { void Do(int a); int P { get; } }')).toEqual(['<interface>', 'void Do(int a)', 'int P {get;}']);
    expect(surface('namespace N; public enum E : byte { A = 1, B = 2 }')).toEqual(['<enum : byte>', 'A = 1', 'B = 2']);
  });

  it('ignores body, comment and formatting changes but reports signature and default changes', () => {
    const before = fileSurface('src/A.cs', 'namespace N; public class A { public int F(int a) { return 1; } public int P { get; set; } = 1; }');
    const bodyOnly = fileSurface('src/A.cs', 'namespace N; public class A {\n // changed\n public int F(int a) { return 2 + a; }\n public int P { get; set; } = 1; }');
    expect(diffSurfaces(before, bodyOnly)).toEqual({ removed: [], added: [] });

    const changed = fileSurface('src/A.cs', 'namespace N; public class A { public long F(int a) { return 1; } public int P { get; set; } = 2; }');
    const d = diffSurfaces(before, changed);
    expect(d.removed.map((e: { signature: string }) => e.signature)).toEqual(['public int F(int a)', 'public int P {get;set;} = 1']);
    expect(d.added.map((e: { signature: string }) => e.signature)).toEqual(['public long F(int a)', 'public int P {get;set;} = 2']);
  });

  it('extracts the declared name from a signature', () => {
    expect(memberName('public static int Encode(ReadOnlySpan<byte> input)')).toBe('Encode');
    expect(memberName('public int Count {get;set;} = 5')).toBe('Count');
    expect(memberName('public event EventHandler Changed')).toBe('Changed');
    expect(memberName('Alpha = 1')).toBe('Alpha');
  });
});
