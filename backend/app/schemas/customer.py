from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.customer import CustomerType

class AddressBookBase(BaseModel):
    title: str
    address_line: str
    province_id: int
    district_id: Optional[int] = None
    neighborhood: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_default: bool = False

class AddressBookCreate(AddressBookBase):
    pass

class AddressBookOut(AddressBookBase):
    id: int
    customer_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class CustomerProfileBase(BaseModel):
    customer_type: str = CustomerType.INDIVIDUAL
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    company_name: Optional[str] = None
    tax_office: Optional[str] = None
    tax_number: Optional[str] = None

class CustomerProfileCreate(CustomerProfileBase):
    pass

class CustomerProfileOut(CustomerProfileBase):
    id: int
    user_id: int
    wallet_balance: Optional[float] = 0.0
    created_at: datetime
    updated_at: datetime
    addresses: List[AddressBookOut] = []

    class Config:
        from_attributes = True

class WalletTransactionOut(BaseModel):
    id: int
    customer_id: int
    amount: float
    transaction_type: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class WalletDeposit(BaseModel):
    amount: float

class ReturnCodeCreate(BaseModel):
    description: Optional[str] = None

class ReturnCodeOut(BaseModel):
    id: int
    customer_id: int
    code: str
    description: Optional[str] = None
    is_active: bool
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

