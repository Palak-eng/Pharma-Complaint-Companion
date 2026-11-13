from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from models import Complaint
from schemas import ComplaintCreate, ComplaintUpdate


def get_next_complaint_id(db: Session) -> str:
    last = db.query(Complaint).order_by(Complaint.id.desc()).first()
    if last:
        num = int(last.complaint_id.split("-")[1]) + 1
    else:
        num = 1
    return f"CC-{num:04d}"


def create_complaint(db: Session, data: ComplaintCreate) -> Complaint:
    complaint = Complaint(
        complaint_id=get_next_complaint_id(db),
        complaint_source=data.complaint_source,
        customer_name=data.customer_name,
        product_name=data.product_name,
        product_strength=data.product_strength,
        batch_number=data.batch_number,
        manufacturing_date=data.manufacturing_date,
        expiry_date=data.expiry_date,
        quantity_affected=data.quantity_affected,
        complaint_type=data.complaint_type,
        complaint_date=data.complaint_date,
        description=data.description,
        initial_severity=data.initial_severity,
        priority=data.priority,
        status=data.status,
        risk_class=data.risk_class,
        risk_summary=data.risk_summary,
        risk_rationale=data.risk_rationale,
        completeness_score=data.completeness_score,
        missing_fields=data.missing_fields,
        probable_root_causes=data.probable_root_causes,
        capa_recommendations=data.capa_recommendations,
        regulatory_flags=data.regulatory_flags,
        ai_summary=data.ai_summary,
        source_text=data.source_text,
        source_name=data.source_name,
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


def update_complaint(db: Session, complaint_id: str, data: ComplaintUpdate) -> Complaint | None:
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        return None
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(complaint, key, value)
    db.commit()
    db.refresh(complaint)
    return complaint


def delete_complaint(db: Session, complaint_id: str) -> bool:
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()
    if not complaint:
        return False
    db.delete(complaint)
    db.commit()
    return True


def get_complaints(
    db: Session,
    skip: int = 0,
    limit: int = 50,
    status: str | None = None,
    risk_class: str | None = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> list[Complaint]:
    query = db.query(Complaint)
    if status:
        query = query.filter(Complaint.status == status)
    if risk_class:
        query = query.filter(Complaint.risk_class == risk_class)
    sort_column = getattr(Complaint, sort_by, Complaint.created_at)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())
    return query.offset(skip).limit(limit).all()


def get_complaint(db: Session, complaint_id: str) -> Complaint | None:
    return db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()


def get_complaint_count(db: Session, status: str | None = None, risk_class: str | None = None) -> int:
    query = db.query(func.count(Complaint.id))
    if status:
        query = query.filter(Complaint.status == status)
    if risk_class:
        query = query.filter(Complaint.risk_class == risk_class)
    return query.scalar() or 0


def search_complaints(db: Session, query: str) -> list[Complaint]:
    pattern = f"%{query}%"
    return db.query(Complaint).filter(
        or_(
            Complaint.product_name.ilike(pattern),
            Complaint.customer_name.ilike(pattern),
            Complaint.complaint_id.ilike(pattern),
            Complaint.batch_number.ilike(pattern),
            Complaint.description.ilike(pattern),
        )
    ).order_by(Complaint.id.desc()).limit(20).all()


def get_similar_complaints(db: Session, product_name: str, complaint_type: str, batch_number: str) -> list[Complaint]:
    query = db.query(Complaint)
    conditions = []
    if product_name:
        conditions.append(Complaint.product_name.ilike(f"%{product_name}%"))
    if complaint_type:
        conditions.append(Complaint.complaint_type.ilike(f"%{complaint_type}%"))
    if batch_number:
        conditions.append(Complaint.batch_number.ilike(f"%{batch_number}%"))
    if conditions:
        query = query.filter(or_(*conditions))
    return query.order_by(Complaint.id.desc()).limit(10).all()
