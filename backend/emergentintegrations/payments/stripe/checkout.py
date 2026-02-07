class CheckoutSessionResponse:
    session_id: str
    url: str
    payment_status: str
    status: str
    amount_total: int
    currency: str
    metadata: dict

    def __init__(self, session_id="mock_session", url="http://localhost:3000/mock_checkout", payment_status="unpaid", status="open", amount_total=0, currency="usd", metadata={}):
        self.session_id = session_id
        self.url = url
        self.payment_status = payment_status
        self.status = status
        self.amount_total = amount_total
        self.currency = currency
        self.metadata = metadata

class CheckoutSessionRequest:
    def __init__(self, amount, currency, success_url, cancel_url, metadata):
        self.amount = amount
        self.currency = currency
        self.success_url = success_url
        self.cancel_url = cancel_url
        self.metadata = metadata

class StripeCheckout:
    def __init__(self, api_key, webhook_url):
        self.api_key = api_key
        self.webhook_url = webhook_url

    async def create_checkout_session(self, request):
        return CheckoutSessionResponse(payment_status="paid") # Auto-pay for testing

    async def get_checkout_status(self, session_id):
        return CheckoutSessionResponse(payment_status="paid")

    async def handle_webhook(self, body, sig_header):
        return CheckoutSessionResponse(payment_status="paid")
