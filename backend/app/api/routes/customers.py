from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.models.customer import CustomerProfile, AddressBook, WalletTransaction, ReturnCode
from app.models.user import User
from app.api.deps import get_current_user
from app.schemas.customer import CustomerProfileCreate, CustomerProfileOut, AddressBookCreate, AddressBookOut, WalletTransactionOut, ReturnCodeOut

router = APIRouter(tags=["Müşteriler"])

@router.get("/customers", response_model=List[CustomerProfileOut])
def get_customers(db: Session = Depends(get_db)):
    return db.query(CustomerProfile).all()

@router.post("/customers", response_model=CustomerProfileOut)
def create_customer(
    customer: CustomerProfileCreate, 
    user_id: int, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    
    # Check if profile already exists
    existing = db.query(CustomerProfile).filter(CustomerProfile.user_id == user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu kullanıcının zaten bir müşteri profili var")
        
    db_customer = CustomerProfile(**customer.model_dump(), user_id=user_id)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@router.get("/customers/{customer_id}", response_model=CustomerProfileOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(CustomerProfile).filter(CustomerProfile.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    return customer

@router.post("/customers/{customer_id}/addresses", response_model=AddressBookOut)
def add_address(
    customer_id: int, 
    address: AddressBookCreate, 
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    customer = db.query(CustomerProfile).filter(CustomerProfile.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
        
    db_address = AddressBook(**address.model_dump(), customer_id=customer_id)
    db.add(db_address)
    db.commit()
    db.refresh(db_address)
    return db_address

@router.get("/customers/{customer_id}/addresses", response_model=List[AddressBookOut])
def get_addresses(customer_id: int, db: Session = Depends(get_db)):
    return db.query(AddressBook).filter(AddressBook.customer_id == customer_id).all()

@router.delete("/customers/{customer_id}/addresses/{address_id}", status_code=204)
def delete_address(
    customer_id: int, 
    address_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    address = db.query(AddressBook).filter(AddressBook.id == address_id, AddressBook.customer_id == customer_id).first()
    if not address:
        raise HTTPException(status_code=404, detail="Adres bulunamadı")
    db.delete(address)
    db.commit()

@router.get("/customers/{customer_id}/wallet")
def get_customer_wallet(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(CustomerProfile).filter(CustomerProfile.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Müşteri bulunamadı")
    
    balance = customer.wallet_balance or 0.0
    transactions = db.query(WalletTransaction).filter(WalletTransaction.customer_id == customer_id).order_by(WalletTransaction.created_at.desc()).all()
    
    return {
        "balance": balance,
        "transactions": [WalletTransactionOut.model_validate(t) for t in transactions]
    }

@router.get("/customers/{customer_id}/return-codes", response_model=List[ReturnCodeOut])
def get_customer_return_codes(customer_id: int, db: Session = Depends(get_db)):
    codes = db.query(ReturnCode).filter(ReturnCode.customer_id == customer_id).order_by(ReturnCode.created_at.desc()).all()
    return codes
