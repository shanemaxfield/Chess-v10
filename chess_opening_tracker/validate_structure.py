"""
Simple validation script to check the module structure.
This doesn't require python-chess to be installed.
"""

import sys
import os


def validate_module_structure():
    """Validate that all required files exist and are importable."""
    print("Validating Chess Opening Tracker structure...\n")

    # Check directory structure
    required_files = [
        "chess_opening_tracker/__init__.py",
        "chess_opening_tracker/models.py",
        "chess_opening_tracker/opening_tracker.py",
        "chess_opening_tracker/opening_database.py",
        "chess_opening_tracker/transposition_detector.py",
        "chess_opening_tracker/database_builder.py",
        "chess_opening_tracker/examples.py",
        "chess_opening_tracker/README.md",
        "chess_opening_tracker/tests/__init__.py",
        "chess_opening_tracker/tests/test_openings.py",
    ]

    print("Checking file structure:")
    all_exist = True
    for file_path in required_files:
        exists = os.path.exists(file_path)
        status = "✓" if exists else "✗"
        print(f"  {status} {file_path}")
        if not exists:
            all_exist = False

    if not all_exist:
        print("\n✗ Some required files are missing!")
        return False

    print("\n✓ All required files exist")

    # Try importing modules (this will fail without chess library, but we can catch it)
    print("\nValidating module imports:")

    try:
        from chess_opening_tracker import models
        print("  ✓ models.py imports successfully")

        # Check data classes exist
        assert hasattr(models, 'OpeningInfo')
        assert hasattr(models, 'TranspositionRoute')
        assert hasattr(models, 'BookStatus')
        assert hasattr(models, 'TheoryStatus')
        assert hasattr(models, 'Continuation')
        assert hasattr(models, 'Plan')
        print("  ✓ All data models defined correctly")

    except Exception as e:
        print(f"  ✗ Failed to import models: {e}")
        return False

    # Check main module
    print("\nChecking main __init__.py exports:")
    try:
        import chess_opening_tracker
        exports = ['OpeningTracker', 'OpeningInfo', 'TranspositionRoute', 'BookStatus', 'TheoryStatus', 'Continuation', 'Plan']

        for export in exports:
            if export in chess_opening_tracker.__all__:
                print(f"  ✓ {export} exported")
            else:
                print(f"  ✗ {export} not in __all__")

    except Exception as e:
        print(f"  ✗ Failed to check exports: {e}")

    # Note about dependencies
    print("\n" + "=" * 60)
    print("NOTE: Full functionality requires python-chess library")
    print("Install with: pip install python-chess")
    print("=" * 60)

    print("\n✓ Basic structure validation passed!")
    print("\nTo run full tests:")
    print("  1. Install dependencies: pip install python-chess requests")
    print("  2. Run tests: python chess_opening_tracker/tests/test_openings.py")
    print("  3. Run examples: python chess_opening_tracker/examples.py")

    return True


if __name__ == "__main__":
    success = validate_module_structure()
    sys.exit(0 if success else 1)
