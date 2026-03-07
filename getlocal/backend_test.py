#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import time

class GetLocalAPITester:
    def __init__(self, base_url="http://localhost:3000"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def test_api_endpoint(self, name, method, endpoint, expected_status=200, data=None, headers=None):
        """Test a single API endpoint"""
        url = f"{self.base_url}{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

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
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except requests.exceptions.RequestException as e:
            self.log_test(name, False, f"Request error: {str(e)}")
            return False, {}
        except Exception as e:
            self.log_test(name, False, f"Unexpected error: {str(e)}")
            return False, {}

    def test_candidates_api(self):
        """Test candidates API endpoints"""
        print("\n🔍 Testing Candidates API...")
        
        # Test GET /api/candidates
        success, data = self.test_api_endpoint(
            "GET /api/candidates",
            "GET",
            "/api/candidates"
        )
        
        if success and 'candidates' in data:
            candidates_count = len(data['candidates'])
            print(f"   Found {candidates_count} candidates")
            return data['candidates']
        return []

    def test_wallet_api(self):
        """Test wallet API endpoints"""
        print("\n💰 Testing Wallet API...")
        
        # Test GET /api/wallet
        success, data = self.test_api_endpoint(
            "GET /api/wallet",
            "GET",
            "/api/wallet"
        )
        
        if success:
            balance = data.get('balance', 0)
            unlocked = len(data.get('unlockedCandidates', []))
            print(f"   Wallet balance: {balance} credits")
            print(f"   Unlocked candidates: {unlocked}")
            return data
        return {}

    def test_unlock_api(self, candidate_id):
        """Test unlock API endpoint"""
        print(f"\n🔓 Testing Unlock API for candidate {candidate_id}...")
        
        # Test POST /api/unlock
        success, data = self.test_api_endpoint(
            "POST /api/unlock",
            "POST",
            "/api/unlock",
            expected_status=200,
            data={"candidateId": candidate_id}
        )
        
        if success:
            new_balance = data.get('newBalance', 0)
            phone = data.get('phone', 'N/A')
            print(f"   New balance: {new_balance} credits")
            print(f"   Unlocked phone: {phone}")
            return data
        return {}

    def test_jobs_api(self):
        """Test jobs API endpoints"""
        print("\n💼 Testing Jobs API...")
        
        # Test GET /api/jobs
        success, data = self.test_api_endpoint(
            "GET /api/jobs",
            "GET",
            "/api/jobs"
        )
        
        if success and 'jobs' in data:
            jobs_count = len(data['jobs'])
            total_credits = data.get('totalCredits', 0)
            print(f"   Found {jobs_count} jobs")
            print(f"   Total credits used: {total_credits}")
            return data['jobs']
        return []

    def test_upload_audio_api(self):
        """Test audio upload API (without actual file)"""
        print("\n🎤 Testing Upload Audio API...")
        
        # Test POST /api/upload-audio without file (should fail)
        success, data = self.test_api_endpoint(
            "POST /api/upload-audio (no file)",
            "POST",
            "/api/upload-audio",
            expected_status=400,
            data={}
        )
        
        # This should fail as expected since we're not sending a file
        return success

    def run_integration_tests(self):
        """Run integration tests"""
        print("\n🔄 Running Integration Tests...")
        
        # Get initial wallet state
        initial_wallet = self.test_wallet_api()
        initial_balance = initial_wallet.get('balance', 0)
        
        # Get candidates
        candidates = self.test_candidates_api()
        
        if candidates and initial_balance >= 10:
            # Try to unlock first candidate
            first_candidate = candidates[0]
            candidate_id = first_candidate.get('_id')
            
            if candidate_id:
                unlock_result = self.test_unlock_api(candidate_id)
                
                if unlock_result:
                    # Verify balance was deducted
                    final_wallet = self.test_wallet_api()
                    final_balance = final_wallet.get('balance', 0)
                    
                    expected_balance = initial_balance - 10
                    balance_correct = final_balance == expected_balance
                    
                    self.log_test(
                        "Credit deduction verification",
                        balance_correct,
                        f"Expected: {expected_balance}, Got: {final_balance}"
                    )
                    
                    # Check if candidate is in unlocked list
                    unlocked_candidates = final_wallet.get('unlockedCandidates', [])
                    is_unlocked = candidate_id in unlocked_candidates
                    
                    self.log_test(
                        "Candidate unlock verification",
                        is_unlocked,
                        f"Candidate {candidate_id} in unlocked list: {is_unlocked}"
                    )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting GetLocal API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test individual APIs
        self.test_candidates_api()
        self.test_wallet_api()
        self.test_jobs_api()
        self.test_upload_audio_api()
        
        # Run integration tests
        self.run_integration_tests()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        # Save detailed results
        results = {
            "summary": {
                "total_tests": self.tests_run,
                "passed_tests": self.tests_passed,
                "success_rate": round(self.tests_passed/self.tests_run*100, 1),
                "timestamp": datetime.now().isoformat()
            },
            "test_results": self.test_results
        }
        
        with open('/app/getlocal/test_results.json', 'w') as f:
            json.dump(results, f, indent=2)
        
        return self.tests_passed == self.tests_run

def main():
    tester = GetLocalAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())