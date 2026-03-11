"""
Test Suite for GetLocal V2 - Phase 7: Razorpay Payment Gateway Integration
Tests: Wallet API, Payment Order Creation, Payment Verification, Unlock Flow with Credits

MOCK MODE: Razorpay is in mock mode (placeholder keys). Credits are added directly
without real payment checkout when mock=true is passed to verify endpoint.
"""

import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:3000').rstrip('/')

# Credit packs configuration
CREDIT_PACKS = {
    10: 50000,   # 10 credits = Rs 500 (in paise)
    25: 100000,  # 25 credits = Rs 1000
    50: 175000,  # 50 credits = Rs 1750
}

class TestWalletAPI:
    """Test GET /nextapi/wallet - Wallet balance and unlocked candidates"""
    
    def test_wallet_new_employer_returns_zero_balance(self):
        """New employer should have 0 credits and empty unlockedCandidates"""
        unique_employer = f"test-pay-new-{uuid.uuid4().hex[:8]}"
        response = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={unique_employer}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Data assertions
        assert "balance" in data, "Response should have 'balance' field"
        assert "unlockedCandidates" in data, "Response should have 'unlockedCandidates' field"
        assert data["balance"] == 0, f"New employer should have 0 credits, got {data['balance']}"
        assert isinstance(data["unlockedCandidates"], list), "unlockedCandidates should be a list"
        print(f"PASS: New employer {unique_employer} has balance=0 and unlockedCandidates=[]")
    
    def test_wallet_default_employer(self):
        """Test wallet for default employer"""
        response = requests.get(f"{BASE_URL}/nextapi/wallet")
        
        assert response.status_code == 200
        data = response.json()
        assert "balance" in data
        assert "unlockedCandidates" in data
        print(f"PASS: Default employer wallet - balance={data['balance']}")


class TestPaymentCreateOrder:
    """Test POST /nextapi/payments/create-order - Mock order creation"""
    
    def test_create_order_10_credits(self):
        """Create order for 10 credits pack = Rs 500 (50000 paise)"""
        employer_id = f"test-pay-order-{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 10, "employer_id": employer_id}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify mock order response
        assert data.get("success") == True, "Response should have success=true"
        assert data.get("mock") == True, "Should be mock=true (placeholder keys)"
        assert data.get("credits_to_add") == 10, f"Expected 10 credits, got {data.get('credits_to_add')}"
        
        # Verify order details
        order = data.get("order", {})
        assert order.get("amount") == 50000, f"10 credits should be 50000 paise, got {order.get('amount')}"
        assert order.get("currency") == "INR", "Currency should be INR"
        assert order.get("id", "").startswith("order_mock_"), "Mock order ID should start with order_mock_"
        
        print(f"PASS: Created mock order for 10 credits, amount={order.get('amount')} paise")
    
    def test_create_order_25_credits(self):
        """Create order for 25 credits pack = Rs 1000 (100000 paise)"""
        employer_id = f"test-pay-order-{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 25, "employer_id": employer_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("mock") == True
        assert data.get("credits_to_add") == 25
        assert data.get("order", {}).get("amount") == 100000
        print(f"PASS: Created mock order for 25 credits, amount=100000 paise")
    
    def test_create_order_50_credits(self):
        """Create order for 50 credits pack = Rs 1750 (175000 paise)"""
        employer_id = f"test-pay-order-{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 50, "employer_id": employer_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("mock") == True
        assert data.get("credits_to_add") == 50
        assert data.get("order", {}).get("amount") == 175000
        print(f"PASS: Created mock order for 50 credits, amount=175000 paise")
    
    def test_create_order_invalid_credits_returns_400(self):
        """Invalid credit amount (not 10, 25, or 50) should return 400"""
        employer_id = f"test-pay-order-{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 7, "employer_id": employer_id}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid credits, got {response.status_code}"
        data = response.json()
        assert "error" in data
        print(f"PASS: Invalid credits (7) returns 400 with error: {data.get('error')}")
    
    def test_create_order_missing_employer_id_returns_400(self):
        """Missing employer_id should return 400"""
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 10}
        )
        
        assert response.status_code == 400, f"Expected 400 for missing employer_id, got {response.status_code}"
        data = response.json()
        assert "error" in data
        print(f"PASS: Missing employer_id returns 400 with error: {data.get('error')}")
    
    def test_create_order_missing_credits_returns_400(self):
        """Missing credits should return 400"""
        employer_id = f"test-pay-order-{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"employer_id": employer_id}
        )
        
        assert response.status_code == 400, f"Expected 400 for missing credits, got {response.status_code}"
        print(f"PASS: Missing credits returns 400")


class TestPaymentVerify:
    """Test POST /nextapi/payments/verify - Mock payment verification adds credits"""
    
    def test_verify_mock_payment_adds_credits(self):
        """Verify mock=true adds credits directly to employer wallet"""
        employer_id = f"test-pay-verify-{uuid.uuid4().hex[:8]}"
        
        # First check initial balance
        wallet_response = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}")
        initial_balance = wallet_response.json().get("balance", 0)
        assert initial_balance == 0, f"New employer should start with 0 credits"
        
        # Mock verify to add 10 credits
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response
        assert data.get("success") == True
        assert data.get("verified") == True
        assert data.get("mock") == True
        assert data.get("credits_added") == 10
        assert data.get("new_balance") == 10
        
        # Verify via GET wallet to confirm persistence
        wallet_check = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}")
        assert wallet_check.json().get("balance") == 10
        
        print(f"PASS: Mock verify added 10 credits. Balance: {data.get('new_balance')}")
    
    def test_verify_accumulates_credits(self):
        """Multiple purchases accumulate credits"""
        employer_id = f"test-pay-accum-{uuid.uuid4().hex[:8]}"
        
        # Buy 10 credits
        response1 = requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        assert response1.json().get("new_balance") == 10
        
        # Buy 25 more credits
        response2 = requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 25, "mock": True}
        )
        assert response2.json().get("new_balance") == 35  # 10 + 25
        
        # Verify via wallet
        wallet = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}")
        assert wallet.json().get("balance") == 35
        
        print(f"PASS: Credits accumulate correctly: 10 + 25 = 35")
    
    def test_verify_invalid_credits_returns_400(self):
        """Invalid credit amount in verify should return 400"""
        employer_id = f"test-pay-verify-{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 15, "mock": True}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid credits, got {response.status_code}"
        print(f"PASS: Invalid credit amount (15) in verify returns 400")
    
    def test_verify_missing_employer_returns_400(self):
        """Missing employer_id in verify should return 400"""
        response = requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"credits": 10, "mock": True}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        print(f"PASS: Missing employer_id in verify returns 400")


class TestUnlockWithCredits:
    """Test POST /nextapi/unlock - Unlock costs 1 credit"""
    
    @pytest.fixture
    def test_candidate_id(self):
        """Get a valid candidate ID for testing"""
        response = requests.get(f"{BASE_URL}/nextapi/candidates")
        candidates = response.json().get("candidates", [])
        if not candidates:
            pytest.skip("No candidates in database to test unlock")
        return candidates[0].get("_id")
    
    def test_unlock_insufficient_credits_returns_402(self, test_candidate_id):
        """Unlock with 0 credits should return 402 insufficient_credits"""
        employer_id = f"test-unlock-no-credits-{uuid.uuid4().hex[:8]}"
        
        # Verify starting with 0 credits
        wallet = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}")
        assert wallet.json().get("balance") == 0
        
        # Try to unlock
        response = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": test_candidate_id, "employer_id": employer_id}
        )
        
        assert response.status_code == 402, f"Expected 402, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("error") == "insufficient_credits"
        assert data.get("required") == 1
        assert data.get("available") == 0
        
        print(f"PASS: Unlock with 0 credits returns 402 insufficient_credits")
    
    def test_unlock_deducts_one_credit(self, test_candidate_id):
        """Successful unlock deducts exactly 1 credit and returns phone"""
        employer_id = f"test-unlock-success-{uuid.uuid4().hex[:8]}"
        
        # First add credits via mock payment
        requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        
        # Verify 10 credits
        wallet_before = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}")
        assert wallet_before.json().get("balance") == 10
        
        # Unlock candidate
        response = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": test_candidate_id, "employer_id": employer_id}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response
        assert data.get("success") == True
        assert data.get("newBalance") == 9, f"Balance should be 9 after unlock, got {data.get('newBalance')}"
        assert "phone" in data, "Response should contain phone number"
        
        # Verify wallet updated
        wallet_after = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}")
        assert wallet_after.json().get("balance") == 9
        
        # Verify unlockedCandidates updated
        assert test_candidate_id in wallet_after.json().get("unlockedCandidates", [])
        
        print(f"PASS: Unlock deducted 1 credit (10 -> 9), phone returned")
    
    def test_unlock_already_unlocked_no_deduction(self, test_candidate_id):
        """Unlocking same candidate again should NOT deduct credits"""
        employer_id = f"test-unlock-twice-{uuid.uuid4().hex[:8]}"
        
        # Add credits
        requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        
        # First unlock
        response1 = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": test_candidate_id, "employer_id": employer_id}
        )
        assert response1.status_code == 200
        balance_after_first = response1.json().get("newBalance")
        
        # Second unlock (same candidate)
        response2 = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": test_candidate_id, "employer_id": employer_id}
        )
        
        assert response2.status_code == 200
        data = response2.json()
        
        # Balance should NOT change
        assert data.get("newBalance") == balance_after_first, "Balance should not change for already unlocked"
        assert "Already unlocked" in data.get("message", "")
        
        print(f"PASS: Re-unlocking same candidate does NOT deduct credits")
    
    def test_unlock_missing_candidate_id_returns_400(self):
        """Missing candidateId should return 400"""
        employer_id = f"test-unlock-{uuid.uuid4().hex[:8]}"
        
        response = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"employer_id": employer_id}
        )
        
        assert response.status_code == 400
        print(f"PASS: Missing candidateId returns 400")
    
    def test_unlock_invalid_candidate_returns_404(self):
        """Invalid candidateId should return 404"""
        employer_id = f"test-unlock-{uuid.uuid4().hex[:8]}"
        
        # Add credits first
        requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        
        response = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": "nonexistent-candidate-id", "employer_id": employer_id}
        )
        
        assert response.status_code == 404
        print(f"PASS: Invalid candidateId returns 404")


class TestE2EPaymentFlow:
    """End-to-end payment flow test"""
    
    def test_full_payment_and_unlock_flow(self):
        """Full E2E: Create order -> Verify -> Unlock -> Check balance"""
        employer_id = f"test-e2e-flow-{uuid.uuid4().hex[:8]}"
        
        # Step 1: Check initial state (0 credits)
        wallet1 = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}")
        assert wallet1.json().get("balance") == 0
        print(f"Step 1: Initial balance = 0")
        
        # Step 2: Create mock order
        order_response = requests.post(
            f"{BASE_URL}/nextapi/payments/create-order",
            json={"credits": 10, "employer_id": employer_id}
        )
        assert order_response.status_code == 200
        assert order_response.json().get("mock") == True
        print(f"Step 2: Mock order created")
        
        # Step 3: Verify payment (mock mode adds credits directly)
        verify_response = requests.post(
            f"{BASE_URL}/nextapi/payments/verify",
            json={"employer_id": employer_id, "credits": 10, "mock": True}
        )
        assert verify_response.status_code == 200
        assert verify_response.json().get("new_balance") == 10
        print(f"Step 3: Credits added, balance = 10")
        
        # Step 4: Get a candidate to unlock
        candidates_response = requests.get(f"{BASE_URL}/nextapi/candidates")
        candidates = candidates_response.json().get("candidates", [])
        if not candidates:
            pytest.skip("No candidates to unlock")
        candidate_id = candidates[0].get("_id")
        
        # Step 5: Unlock candidate
        unlock_response = requests.post(
            f"{BASE_URL}/nextapi/unlock",
            json={"candidateId": candidate_id, "employer_id": employer_id}
        )
        assert unlock_response.status_code == 200
        assert unlock_response.json().get("newBalance") == 9
        assert "phone" in unlock_response.json()
        print(f"Step 5: Candidate unlocked, balance = 9")
        
        # Step 6: Verify final state
        wallet_final = requests.get(f"{BASE_URL}/nextapi/wallet?employer_id={employer_id}")
        final_data = wallet_final.json()
        assert final_data.get("balance") == 9
        assert candidate_id in final_data.get("unlockedCandidates", [])
        print(f"Step 6: Final state verified - balance=9, candidate in unlockedCandidates")
        
        print(f"\nPASS: Full E2E payment flow completed successfully!")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
