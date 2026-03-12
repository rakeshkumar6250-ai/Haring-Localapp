"""
Phase 8: Employer Unlock Experience Tests
Tests for credit balance, buy credits, unlock flow, and payment APIs
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestWalletAPI:
    """Test wallet balance and credit operations"""
    
    def test_get_wallet_default_employer(self):
        """GET /nextapi/wallet returns balance for default employer"""
        response = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id=default-employer")
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        assert "unlockedCandidates" in data
        assert isinstance(data["balance"], (int, float))
        assert isinstance(data["unlockedCandidates"], list)
        print(f"Default employer balance: {data['balance']}, unlocked: {len(data['unlockedCandidates'])}")
    
    def test_get_wallet_new_employer(self):
        """GET /nextapi/wallet returns 0 balance for new employer"""
        new_employer = f"test-wallet-{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={new_employer}")
        assert response.status_code == 200
        data = response.json()
        assert data["balance"] == 0
        assert data["unlockedCandidates"] == []
        print(f"New employer {new_employer} has 0 balance")

    def test_post_wallet_add_credits(self):
        """POST /nextapi/wallet adds credits directly"""
        employer_id = f"test-wallet-add-{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/nextapi/wallet",
            json={"amount": 5, "employer_id": employer_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["newBalance"] == 5
        print(f"Added 5 credits to {employer_id}, balance: {data['newBalance']}")


class TestCreateOrderAPI:
    """Test payment order creation"""
    
    def test_create_order_10_credits(self):
        """POST /nextapi/payments/create-order for 10 credits = ₹500"""
        employer_id = f"test-order-{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 10, "employer_id": employer_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["order"]["amount"] == 50000  # 500 rupees in paise
        assert data["credits_to_add"] == 10
        assert data["mock"] == True  # Placeholder keys
        print(f"Order created: {data['order']['id']} for 10 credits")
    
    def test_create_order_25_credits(self):
        """POST /nextapi/payments/create-order for 25 credits = ₹1000"""
        employer_id = f"test-order-{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 25, "employer_id": employer_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["order"]["amount"] == 100000  # 1000 rupees in paise
        assert data["credits_to_add"] == 25
        print(f"Order created: {data['order']['id']} for 25 credits")
    
    def test_create_order_invalid_credits(self):
        """POST /nextapi/payments/create-order with invalid credits returns 400"""
        employer_id = f"test-order-{uuid.uuid4().hex[:8]}"
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 7, "employer_id": employer_id}
        )
        assert response.status_code == 400
        print("Invalid credits correctly rejected")
    
    def test_create_order_missing_employer(self):
        """POST /nextapi/payments/create-order without employer_id returns 400"""
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 10}
        )
        assert response.status_code == 400
        print("Missing employer_id correctly rejected")


class TestVerifyPaymentAPI:
    """Test payment verification (mock mode)"""
    
    def test_verify_mock_payment_adds_credits(self):
        """POST /nextapi/payments/verify with mock=true adds credits"""
        employer_id = f"test-verify-{uuid.uuid4().hex[:8]}"
        
        # Verify mock payment
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == True
        assert data["mock"] == True
        assert data["credits_added"] == 10
        assert data["new_balance"] == 10
        print(f"Mock payment verified, balance: {data['new_balance']}")
    
    def test_verify_credits_accumulate(self):
        """Credits accumulate with multiple purchases"""
        employer_id = f"test-accum-{uuid.uuid4().hex[:8]}"
        
        # First purchase
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        assert response.json()["new_balance"] == 10
        
        # Second purchase
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 25, "mock": True}
        )
        assert response.json()["new_balance"] == 35
        print(f"Credits accumulated: 10 + 25 = 35")


class TestUnlockAPI:
    """Test candidate unlock functionality"""
    
    def test_unlock_insufficient_credits(self):
        """POST /nextapi/unlock returns 402 when credits = 0"""
        employer_id = f"test-unlock-{uuid.uuid4().hex[:8]}"
        
        # Get a candidate ID
        candidates_res = requests.get(f"{BASE_URL}/nextapi/candidates")
        candidate_id = candidates_res.json()["candidates"][0]["_id"]
        
        # Try to unlock with 0 credits
        response = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": candidate_id, "employer_id": employer_id}
        )
        assert response.status_code == 402
        data = response.json()
        assert data["error"] == "insufficient_credits"
        print(f"Insufficient credits correctly returned 402")
    
    def test_unlock_deducts_one_credit(self):
        """POST /nextapi/unlock deducts exactly 1 credit"""
        employer_id = f"test-unlock-deduct-{uuid.uuid4().hex[:8]}"
        
        # Add 5 credits
        requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        
        # Get wallet to verify
        wallet = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}").json()
        assert wallet["balance"] == 10
        
        # Get a candidate ID
        candidates_res = requests.get(f"{BASE_URL}/nextapi/candidates")
        candidate_id = candidates_res.json()["candidates"][0]["_id"]
        
        # Unlock
        response = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": candidate_id, "employer_id": employer_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["newBalance"] == 9  # 10 - 1 = 9
        assert "phone" in data
        print(f"Unlocked candidate, phone: {data['phone']}, balance: {data['newBalance']}")
    
    def test_unlock_already_unlocked_no_deduction(self):
        """POST /nextapi/unlock for already unlocked candidate doesn't deduct"""
        employer_id = f"test-unlock-dup-{uuid.uuid4().hex[:8]}"
        
        # Add credits
        requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        
        # Get a candidate
        candidates_res = requests.get(f"{BASE_URL}/nextapi/candidates")
        candidate_id = candidates_res.json()["candidates"][0]["_id"]
        
        # First unlock
        requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": candidate_id, "employer_id": employer_id}
        )
        
        # Check balance after first unlock
        wallet = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}").json()
        balance_after_first = wallet["balance"]
        
        # Second unlock (same candidate)
        response = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": candidate_id, "employer_id": employer_id}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["newBalance"] == balance_after_first  # No deduction
        print(f"Re-unlock didn't deduct credits, balance: {data['newBalance']}")
    
    def test_unlock_missing_candidate_id(self):
        """POST /nextapi/unlock without candidateId returns 400"""
        response = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"employer_id": "test"}
        )
        assert response.status_code == 400
        print("Missing candidateId correctly rejected")
    
    def test_unlock_invalid_candidate_id(self):
        """POST /nextapi/unlock with invalid candidateId returns 404"""
        employer_id = f"test-unlock-invalid-{uuid.uuid4().hex[:8]}"
        
        # Add credits first
        requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        
        response = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": "non-existent-id-12345", "employer_id": employer_id}
        )
        assert response.status_code == 404
        print("Invalid candidateId correctly rejected with 404")


class TestEndToEndFlow:
    """Test complete payment and unlock flow"""
    
    def test_full_payment_unlock_flow(self):
        """E2E: Create order -> Verify -> Unlock -> Check balance"""
        employer_id = f"test-e2e-{uuid.uuid4().hex[:8]}"
        
        # Step 1: Check initial balance (should be 0)
        wallet = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}").json()
        assert wallet["balance"] == 0
        print(f"Step 1: Initial balance = 0")
        
        # Step 2: Create order
        order_res = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 10, "employer_id": employer_id}
        )
        assert order_res.status_code == 200
        assert order_res.json()["mock"] == True
        print(f"Step 2: Order created (mock)")
        
        # Step 3: Verify payment
        verify_res = requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        assert verify_res.json()["new_balance"] == 10
        print(f"Step 3: Payment verified, balance = 10")
        
        # Step 4: Get a candidate
        candidates = requests.get(f"{BASE_URL}/nextapi/candidates").json()["candidates"]
        candidate_id = candidates[0]["_id"]
        
        # Step 5: Unlock candidate
        unlock_res = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": candidate_id, "employer_id": employer_id}
        )
        assert unlock_res.status_code == 200
        assert unlock_res.json()["newBalance"] == 9
        assert "phone" in unlock_res.json()
        print(f"Step 5: Unlocked candidate, balance = 9, phone revealed")
        
        # Step 6: Verify candidate is in unlockedCandidates
        wallet = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}").json()
        assert candidate_id in wallet["unlockedCandidates"]
        print(f"Step 6: Candidate in unlockedCandidates list")
        
        print("E2E flow completed successfully!")


class TestMatchScoreCalculation:
    """Test that match scores work correctly via frontend calc"""
    
    def test_jobs_have_required_fields_for_matching(self):
        """Jobs have minimum_education, english_level, experience_required"""
        response = requests.get(f"{BASE_URL}/nextapi/jobs")
        assert response.status_code == 200
        jobs = response.json()["jobs"]
        
        # Check at least one job has matching fields
        matching_fields_found = False
        for job in jobs:
            if job.get("minimum_education") and job.get("english_level"):
                matching_fields_found = True
                print(f"Job '{job['title']}' has matching fields: edu={job['minimum_education']}, eng={job['english_level']}")
                break
        
        assert matching_fields_found, "No jobs with matching fields found"
    
    def test_candidates_have_required_fields_for_matching(self):
        """Candidates have education_level, english_level, experience_type"""
        response = requests.get(f"{BASE_URL}/nextapi/candidates")
        assert response.status_code == 200
        candidates = response.json()["candidates"]
        
        # Check at least one candidate has matching fields
        matching_fields_found = False
        for candidate in candidates[:10]:  # Check first 10
            if candidate.get("education_level") and candidate.get("english_level"):
                matching_fields_found = True
                print(f"Candidate '{candidate['name']}' has matching fields: edu={candidate['education_level']}, eng={candidate['english_level']}")
                break
        
        assert matching_fields_found, "No candidates with matching fields found"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
