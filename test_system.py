#!/usr/bin/env python3
"""Quick system verification script"""

import sys

def test_imports():
    """Test that all modules can be imported"""
    try:
        import chess
        import requests
        from chess_opening_system import create_opening_system
        print("✅ All imports successful")
        return True
    except ImportError as e:
        print(f"❌ Import failed: {e}")
        return False

def test_eco_parser():
    """Test ECO parser"""
    try:
        from chess_opening_system.data import ECOParser
        parser = ECOParser()
        parser.load_from_csv('data/ECO_codes.csv')
        assert len(parser.openings) > 0
        print(f"✅ ECO Parser working ({len(parser.openings)} codes)")
        return True
    except Exception as e:
        print(f"❌ ECO Parser failed: {e}")
        return False

def test_intent_classifier():
    """Test intent classification"""
    try:
        from chess_opening_system.query import IntentClassifier
        classifier = IntentClassifier()
        intent = classifier.classify("What should I play?")
        assert intent.query_type.value == "recommendation"
        print("✅ Intent Classifier working")
        return True
    except Exception as e:
        print(f"❌ Intent Classifier failed: {e}")
        return False

def test_system_initialization():
    """Test main system"""
    try:
        from chess_opening_system import create_opening_system
        system = create_opening_system()
        stats = system.get_statistics()
        print(f"✅ System initialized ({stats['eco_parser']['total_openings']} openings)")
        return True
    except Exception as e:
        print(f"❌ System initialization failed: {e}")
        return False

def test_query_processing():
    """Test query processing"""
    try:
        from chess_opening_system import create_opening_system
        system = create_opening_system()
        result = system.process_query("What are the main ideas in the Italian Game?")
        assert 'query_type' in result
        assert 'prompt' in result
        print("✅ Query processing working")
        return True
    except Exception as e:
        print(f"❌ Query processing failed: {e}")
        return False

def main():
    print("=" * 60)
    print("Chess Opening Knowledge System - Verification Tests")
    print("=" * 60)
    print()

    tests = [
        ("Imports", test_imports),
        ("ECO Parser", test_eco_parser),
        ("Intent Classifier", test_intent_classifier),
        ("System Initialization", test_system_initialization),
        ("Query Processing", test_query_processing),
    ]

    passed = 0
    total = len(tests)

    for name, test_func in tests:
        print(f"Testing {name}...")
        if test_func():
            passed += 1
        print()

    print("=" * 60)
    print(f"Results: {passed}/{total} tests passed")
    print("=" * 60)

    if passed == total:
        print("\n🎉 All tests passed! System is working correctly.")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed. See errors above.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
