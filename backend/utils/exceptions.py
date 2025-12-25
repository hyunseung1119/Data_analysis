"""
Custom exceptions
"""


class AgentError(Exception):
    """Agent execution error"""
    pass


class WorkflowError(Exception):
    """Workflow execution error"""
    pass


class ConfigError(Exception):
    """Configuration error"""
    pass
