"""The audit rules, in the order they run."""

from .base import AuditContext, Check
from .enum_members import EnumSectionsMatchSource
from .member_references import MemberReferencesExist
from .namespaces import NamespaceMatchesSource
from .options_tables import OptionsTablesMatchSource
from .source_paths import SourcePathsExist
from .undocumented_types import PublicTypesDocumented

ALL_CHECKS: tuple[Check, ...] = (
    SourcePathsExist(),
    NamespaceMatchesSource(),
    OptionsTablesMatchSource(),
    EnumSectionsMatchSource(),
    MemberReferencesExist(),
    PublicTypesDocumented(),
)

__all__ = ["ALL_CHECKS", "AuditContext", "Check"]
