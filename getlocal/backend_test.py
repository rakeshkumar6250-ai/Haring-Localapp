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
        
        # Test GET /nextapi/candidates
        success, data = self.test_api_endpoint(
            "GET /nextapi/candidates",
            "GET",
            "/nextapi/candidates"
        )
        
        if success and 'candidates' in data:
            candidates_count = len(data['candidates'])
            print(f"   Found {candidates_count} candidates")
            return data['candidates']
        return []

    def test_wallet_api(self):
        """Test wallet API endpoints"""
        print("\n💰 Testing Wallet API...")
        
        # Test GET /nextapi/wallet
        success, data = self.test_api_endpoint(
            "GET /nextapi/wallet",
            "GET",
            "/nextapi/wallet"
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
        
        # Test POST /nextapi/unlock
        success, data = self.test_api_endpoint(
            "POST /nextapi/unlock",
            "POST",
            "/nextapi/unlock",
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
        
        # Test GET /nextapi/jobs
        success, data = self.test_api_endpoint(
            "GET /nextapi/jobs",
            "GET",
            "/nextapi/jobs"
        )
        
        if success and 'jobs' in data:
            jobs_count = len(data['jobs'])
            total_credits = data.get('totalCredits', 0)
            print(f"   Found {jobs_count} jobs")
            print(f"   Total credits used: {total_credits}")
            return data['jobs']
        return []

    def test_upload_audio_api(self):
        """Test audio upload API endpoint structure"""
        print("\n🎤 Testing Upload Audio API...")
        
        # Test POST /nextapi/upload-audio without file (should fail)
        success, data = self.test_api_endpoint(
            "POST /nextapi/upload-audio (no file)",
            "POST",
            "/nextapi/upload-audio",
            expected_status=400,
            data={}
        )
        
        # This should fail as expected since we're not sending a file
        return success

    def test_mock_transcription_flow(self):
        """Test mock transcription processing flow with real file upload"""
        print("\n🎯 Testing Mock Transcription Flow...")
        import tempfile
        import os
        
        # Create a small mock .webm file for testing
        test_audio_path = '/tmp/test_audio.webm'
        with open(test_audio_path, 'wb') as f:
            # Write minimal webm header bytes (for testing only)
            f.write(b'\x1a\x45\xdf\xa3\x9f\x42\x86\x81\x01\x42\xf7\x81\x01')
            f.write(b'Mock audio content for testing purposes' * 10)
        
        languages_to_test = ['en', 'hi', 'te']
        upload_results = []
        
        for lang_code in languages_to_test:
            print(f"\n   Testing language: {lang_code}")
            
            # Prepare multipart form data
            try:
                import requests
                url = f"{self.base_url}/nextapi/upload-audio"
                
                with open(test_audio_path, 'rb') as audio_file:
                    files = {'audio': ('test_audio.webm', audio_file, 'audio/webm')}
                    data = {
                        'lang_code': lang_code,
                        'language': lang_code,
                        'interview_type': 'freeform',
                        'questions_answered': '0',
                        'lat': '28.6139',
                        'lng': '77.2090'
                    }
                    
                    response = requests.post(url, files=files, data=data, timeout=15)
                    
                    if response.status_code == 201:
                        result = response.json()
                        candidate_id = result.get('candidateId')
                        
                        print(f"   ✅ Upload successful for {lang_code}: {candidate_id}")
                        upload_results.append({
                            'lang_code': lang_code,
                            'candidate_id': candidate_id,
                            'success': True
                        })
                        
                        self.log_test(f"Audio upload - {lang_code}", True, f"Candidate ID: {candidate_id}")
                        
                    else:
                        print(f"   ❌ Upload failed for {lang_code}: {response.status_code}")
                        self.log_test(f"Audio upload - {lang_code}", False, f"Status: {response.status_code}")
                        upload_results.append({
                            'lang_code': lang_code,
                            'candidate_id': None,
                            'success': False
                        })
                
            except Exception as e:
                print(f"   ❌ Upload error for {lang_code}: {str(e)}")
                self.log_test(f"Audio upload - {lang_code}", False, f"Error: {str(e)}")
                upload_results.append({
                    'lang_code': lang_code,
                    'candidate_id': None,
                    'success': False
                })
        
        # Wait for background processing (5+ seconds)
        print(f"\n   ⏳ Waiting 7 seconds for background mock transcription...")
        time.sleep(7)
        
        # Check if candidates were processed
        processed_count = 0
        for result in upload_results:
            if result['success'] and result['candidate_id']:
                candidate_id = result['candidate_id']
                lang_code = result['lang_code']
                
                # Fetch candidate to check if processed
                success, candidates_data = self.test_api_endpoint(
                    f"Check processing status - {lang_code}",
                    "GET",
                    "/nextapi/candidates"
                )
                
                if success and 'candidates' in candidates_data:
                    candidate = next((c for c in candidates_data['candidates'] if c['_id'] == candidate_id), None)
                    
                    if candidate:
                        is_processed = candidate.get('moltbot_processed', False)
                        has_name = bool(candidate.get('name', '').strip())
                        has_summary = bool(candidate.get('professional_summary', '').strip())
                        has_experience = candidate.get('experience_years', 0) > 0
                        
                        if is_processed and has_name and has_summary:
                            processed_count += 1
                            print(f"   ✅ Candidate {candidate_id} processed successfully")
                            print(f"      Name: {candidate.get('name', 'N/A')}")
                            print(f"      Experience: {candidate.get('experience_years', 0)} years")
                            print(f"      Summary: {candidate.get('professional_summary', 'N/A')[:50]}...")
                            
                            self.log_test(f"Mock transcription processing - {lang_code}", True, 
                                        f"Name: {candidate.get('name')}, Exp: {candidate.get('experience_years')}")
                        else:
                            print(f"   ❌ Candidate {candidate_id} not fully processed")
                            self.log_test(f"Mock transcription processing - {lang_code}", False,
                                        f"Processed: {is_processed}, Name: {has_name}, Summary: {has_summary}")
                    else:
                        print(f"   ❌ Candidate {candidate_id} not found")
                        self.log_test(f"Mock transcription processing - {lang_code}", False, "Candidate not found")
        
        # Clean up
        if os.path.exists(test_audio_path):
            os.remove(test_audio_path)
        
        print(f"\n   📊 Processing Summary: {processed_count}/{len(upload_results)} candidates processed")
        
        return processed_count > 0

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
        
        # Test mock transcription flow (main feature)
        self.test_mock_transcription_flow()
        
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