from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from schemas import ComplaintCreate, ComplaintUpdate, ComplaintResponse
from crud import (
    create_complaint, update_complaint, delete_complaint,
    get_complaints, get_complaint,
    get_complaint_count, search_complaints, get_similar_complaints,
)

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


@router.post("/", response_model=ComplaintResponse)
def create(data: ComplaintCreate, db: Session = Depends(get_db)):
    complaint = create_complaint(db, data)
    return complaint


@router.put("/{complaint_id}", response_model=ComplaintResponse)
def update(complaint_id: str, data: ComplaintUpdate, db: Session = Depends(get_db)):
    complaint = update_complaint(db, complaint_id, data)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.delete("/{complaint_id}")
def delete(complaint_id: str, db: Session = Depends(get_db)):
    success = delete_complaint(db, complaint_id)
    if not success:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return {"message": f"Complaint {complaint_id} deleted"}


@router.get("/", response_model=list[ComplaintResponse])
def list_complaints(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: str | None = Query(None),
    risk_class: str | None = Query(None),
    sort_by: str = Query("created_at", regex="^(created_at|updated_at|risk_class|status|priority)$"),
    sort_order: str = Query("desc", regex="^(asc|desc)$"),
    db: Session = Depends(get_db),
):
    return get_complaints(
        db, skip=skip, limit=limit,
        status=status, risk_class=risk_class,
        sort_by=sort_by, sort_order=sort_order,
    )


@router.get("/count")
def count_complaints(
    status: str | None = Query(None),
    risk_class: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return {"count": get_complaint_count(db, status=status, risk_class=risk_class)}


@router.get("/search", response_model=list[ComplaintResponse])
def search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    return search_complaints(db, q)


@router.get("/{complaint_id}", response_model=ComplaintResponse)
def get_one(complaint_id: str, db: Session = Depends(get_db)):
    complaint = get_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.get("/{complaint_id}/similar", response_model=list[ComplaintResponse])
def find_similar(complaint_id: str, db: Session = Depends(get_db)):
    complaint = get_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return get_similar_complaints(
        db,
        product_name=complaint.product_name,
        complaint_type=complaint.complaint_type,
        batch_number=complaint.batch_number,
    )
