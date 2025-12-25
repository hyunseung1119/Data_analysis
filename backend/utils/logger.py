"""
Logger utility
"""
import logging
from functools import lru_cache


@lru_cache()
def get_logger(name: str = "multi_agent") -> logging.Logger:
    """Get logger instance"""
    logger = logging.getLogger(name)
    
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        ))
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    
    return logger
