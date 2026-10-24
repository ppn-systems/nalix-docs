"""The audit rules, in the order they run."""

from .anchors import AnchorsResolve
from .base import AuditContext, Check
from .diagnostic_codes import DiagnosticCodesMatchSource
from .enum_values import EnumValuesMatchSource
from .enum_members import EnumSectionsMatchSource
from .member_references import MemberReferencesExist
from .namespaces import NamespaceMatchesSource
from .options_tables import OptionsTablesMatchSource
from .package_graph import PackageGraphMatchesProjects
from .package_versions import PackageVersionsExist
from .signatures import SignaturesExist
from .source_paths import SourcePathsExist
from .undocumented_types import PublicTypesDocumented

ALL_CHECKS: tuple[Check, ...] = (
    SourcePathsExist(),
    NamespaceMatchesSource(),
    OptionsTablesMatchSource(),
    EnumSectionsMatchSource(),
    EnumValuesMatchSource(),
    MemberReferencesExist(),
    DiagnosticCodesMatchSource(),
    PackageGraphMatchesProjects(),
    PackageVersionsExist(),
    AnchorsResolve(),
    SignaturesExist(),
    PublicTypesDocumented(),
)

__all__ = ["ALL_CHECKS", "AuditContext", "Check"]
