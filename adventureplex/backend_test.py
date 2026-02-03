#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class AdventurePlexAPITester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_user_id = None
        self.test_user_name = "Test User"
        self.test_phone = "5551234567"

    def log(self, message):
        """Log test messages with timestamp"""
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        self.log(f"🔍 Testing {name}...")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, {}
            else:
                self.log(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    self.log(f"   Error response: {error_data}")
                except:
                    self.log(f"   Response text: {response.text}")
                return False, {}

        except requests.exceptions.RequestException as e:
            self.log(f"❌ FAILED - Network error: {str(e)}")
            return False, {}
        except Exception as e:
            self.log(f"❌ FAILED - Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration with high-entropy ID"""
        self.log("\n=== Testing User Registration ===")
        
        # Test successful registration
        success, response = self.run_test(
            "User Registration",
            "POST",
            "register",
            201,
            data={"name": self.test_user_name, "phone": self.test_phone}
        )
        
        if success:
            self.test_user_id = response.get('user', {}).get('id')
            if self.test_user_id:
                self.log(f"   Generated user ID: {self.test_user_id}")
                # Check if ID is high-entropy (at least 8 hex chars)
                if len(self.test_user_id) >= 8:
                    self.log("   ✅ High-entropy ID generated")
                else:
                    self.log("   ⚠️  ID might not be high-entropy enough")
            else:
                self.log("   ❌ No user ID returned")
                return False
        else:
            return False

        # Test duplicate registration (should return 409)
        success, response = self.run_test(
            "Duplicate Registration",
            "POST", 
            "register",
            409,
            data={"name": self.test_user_name, "phone": self.test_phone}
        )

        # Test validation errors
        self.run_test(
            "Registration - Missing Name",
            "POST",
            "register", 
            400,
            data={"phone": self.test_phone}
        )

        self.run_test(
            "Registration - Missing Phone",
            "POST",
            "register",
            400, 
            data={"name": self.test_user_name}
        )

        self.run_test(
            "Registration - Invalid Phone",
            "POST",
            "register",
            400,
            data={"name": self.test_user_name, "phone": "123"}
        )

        return True

    def test_user_retrieval(self):
        """Test user data retrieval"""
        self.log("\n=== Testing User Retrieval ===")
        
        if not self.test_user_id:
            self.log("❌ No test user ID available")
            return False

        # Test successful user retrieval
        success, response = self.run_test(
            "Get User Data",
            "GET",
            f"user/{self.test_user_id}",
            200
        )

        if success:
            user_data = response
            expected_fields = ['id', 'name', 'phone', 'currentStamps', 'lifetimeVisits', 'joinDate']
            for field in expected_fields:
                if field in user_data:
                    self.log(f"   ✅ Field '{field}': {user_data[field]}")
                else:
                    self.log(f"   ❌ Missing field: {field}")

        # Test non-existent user
        self.run_test(
            "Get Non-existent User",
            "GET",
            "user/nonexistent123",
            404
        )

        return success

    def test_stamp_operations(self):
        """Test stamp adding functionality"""
        self.log("\n=== Testing Stamp Operations ===")
        
        if not self.test_user_id:
            self.log("❌ No test user ID available")
            return False

        # Test adding stamp
        success, response = self.run_test(
            "Add Stamp",
            "POST",
            "stamp",
            200,
            data={"userId": self.test_user_id, "staffId": "STAFF_001"}
        )

        if success:
            new_count = response.get('newCount', 0)
            self.log(f"   New stamp count: {new_count}")
            if new_count == 1:
                self.log("   ✅ Stamp count incremented correctly")
            else:
                self.log(f"   ⚠️  Expected count 1, got {new_count}")

        # Test adding multiple stamps to reach 10
        for i in range(2, 11):  # Add 9 more stamps to reach 10
            success, response = self.run_test(
                f"Add Stamp #{i}",
                "POST",
                "stamp",
                200,
                data={"userId": self.test_user_id, "staffId": "STAFF_001"}
            )
            if success:
                new_count = response.get('newCount', 0)
                self.log(f"   Stamp count now: {new_count}")

        # Test adding stamp when already at 10 (should fail)
        self.run_test(
            "Add Stamp When Full",
            "POST",
            "stamp",
            400,
            data={"userId": self.test_user_id, "staffId": "STAFF_001"}
        )

        # Test validation errors
        self.run_test(
            "Add Stamp - Missing User ID",
            "POST",
            "stamp",
            400,
            data={"staffId": "STAFF_001"}
        )

        self.run_test(
            "Add Stamp - Invalid User ID",
            "POST", 
            "stamp",
            404,
            data={"userId": "invalid123", "staffId": "STAFF_001"}
        )

        return True

    def test_redeem_operations(self):
        """Test reward redemption functionality"""
        self.log("\n=== Testing Redeem Operations ===")
        
        if not self.test_user_id:
            self.log("❌ No test user ID available")
            return False

        # Test successful redemption (user should have 10 stamps from previous test)
        success, response = self.run_test(
            "Redeem Reward",
            "POST",
            "redeem",
            200,
            data={"userId": self.test_user_id, "staffId": "STAFF_001"}
        )

        if success:
            new_count = response.get('newStampCount', -1)
            if new_count == 0:
                self.log("   ✅ Stamps reset to 0 after redemption")
            else:
                self.log(f"   ⚠️  Expected 0 stamps after redemption, got {new_count}")

        # Test redemption when user doesn't have enough stamps
        self.run_test(
            "Redeem Without Enough Stamps",
            "POST",
            "redeem",
            400,
            data={"userId": self.test_user_id, "staffId": "STAFF_001"}
        )

        # Test validation errors
        self.run_test(
            "Redeem - Missing User ID",
            "POST",
            "redeem",
            400,
            data={"staffId": "STAFF_001"}
        )

        self.run_test(
            "Redeem - Invalid User ID",
            "POST",
            "redeem",
            404,
            data={"userId": "invalid123", "staffId": "STAFF_001"}
        )

        return True

    def test_staff_verification(self):
        """Test staff PIN verification"""
        self.log("\n=== Testing Staff Verification ===")
        
        # Test successful verification with correct PIN
        success, response = self.run_test(
            "Staff Verification - Correct PIN",
            "POST",
            "staff/verify",
            200,
            data={"pin": "1234"}
        )

        if success:
            staff_id = response.get('staffId')
            staff_name = response.get('staffName')
            if staff_id and staff_name:
                self.log(f"   ✅ Staff ID: {staff_id}, Name: {staff_name}")
            else:
                self.log("   ⚠️  Missing staff info in response")

        # Test incorrect PIN
        self.run_test(
            "Staff Verification - Wrong PIN",
            "POST",
            "staff/verify",
            401,
            data={"pin": "9999"}
        )

        # Test missing PIN
        self.run_test(
            "Staff Verification - Missing PIN",
            "POST",
            "staff/verify",
            400,
            data={}
        )

        return success

    def test_analytics(self):
        """Test analytics endpoint"""
        self.log("\n=== Testing Analytics ===")
        
        success, response = self.run_test(
            "Get Analytics",
            "GET",
            "analytics",
            200
        )

        if success:
            expected_fields = [
                'totalCustomers', 'stampsToday', 'totalRedemptions', 
                'redemptionsToday', 'activeUsers', 'readyToRedeem', 'recentActivity'
            ]
            for field in expected_fields:
                if field in response:
                    value = response[field]
                    self.log(f"   ✅ {field}: {value}")
                else:
                    self.log(f"   ❌ Missing field: {field}")

        return success

    def test_existing_user(self):
        """Test with existing user Alice Adventure"""
        self.log("\n=== Testing Existing User (Alice Adventure) ===")
        
        alice_id = "2aca780e65c337cf"
        
        # Test retrieving Alice's data
        success, response = self.run_test(
            "Get Alice's Data",
            "GET",
            f"user/{alice_id}",
            200
        )

        if success:
            name = response.get('name', '')
            stamps = response.get('currentStamps', 0)
            self.log(f"   User: {name}, Stamps: {stamps}")
            
            # Test adding a stamp to Alice
            success2, response2 = self.run_test(
                "Add Stamp to Alice",
                "POST",
                "stamp",
                200,
                data={"userId": alice_id, "staffId": "STAFF_001"}
            )
            
            if success2:
                new_count = response2.get('newCount', 0)
                self.log(f"   Alice's new stamp count: {new_count}")

        return success

    def run_all_tests(self):
        """Run all API tests"""
        self.log("🚀 Starting AdventurePlex API Tests")
        self.log(f"Testing against: {self.base_url}")
        
        start_time = time.time()
        
        # Run test suites
        test_suites = [
            ("User Registration", self.test_user_registration),
            ("User Retrieval", self.test_user_retrieval), 
            ("Stamp Operations", self.test_stamp_operations),
            ("Redeem Operations", self.test_redeem_operations),
            ("Staff Verification", self.test_staff_verification),
            ("Analytics", self.test_analytics),
            ("Existing User", self.test_existing_user)
        ]

        suite_results = []
        for suite_name, test_func in test_suites:
            try:
                result = test_func()
                suite_results.append((suite_name, result))
            except Exception as e:
                self.log(f"❌ Test suite '{suite_name}' failed with error: {e}")
                suite_results.append((suite_name, False))

        # Print final results
        end_time = time.time()
        duration = end_time - start_time
        
        self.log(f"\n{'='*50}")
        self.log("📊 FINAL TEST RESULTS")
        self.log(f"{'='*50}")
        self.log(f"Total tests run: {self.tests_run}")
        self.log(f"Tests passed: {self.tests_passed}")
        self.log(f"Tests failed: {self.tests_run - self.tests_passed}")
        self.log(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        self.log(f"Duration: {duration:.2f} seconds")
        
        self.log(f"\nTest Suite Results:")
        for suite_name, result in suite_results:
            status = "✅ PASSED" if result else "❌ FAILED"
            self.log(f"  {suite_name}: {status}")

        # Return exit code
        return 0 if self.tests_passed == self.tests_run else 1

def main():
    """Main test runner"""
    tester = AdventurePlexAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())