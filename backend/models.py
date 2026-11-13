from sqlalchemy import Column, Integer, String, Text, DateTime, Float, JSON
from sqlalchemy.sql import func
from database import Base


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True)
    complaint_id = Column(String(20), unique=True, index=True, nullable=False)

    complaint_source = Column(String(255), default="")
    customer_name = Column(String(255), default="")
    product_name = Column(String(255), default="")
    product_strength = Column(String(255), default="")
    batch_number = Column(String(100), default="")
    manufacturing_date = Column(String(20), default="")
    expiry_date = Column(String(20), default="")
    quantity_affected = Column(String(50), default="")
    complaint_type = Column(String(100), default="")
    complaint_date = Column(String(20), default="")
    description = Column(Text, default="")
    initial_severity = Column(String(20), default="")
    priority = Column(String(20), default="")

    status = Column(String(20), default="Open")
    risk_class = Column(String(20), default="")
    risk_summary = Column(Text, default="")
    risk_rationale = Column(Text, default="")
    completeness_score = Column(Float, default=0.0)
    missing_fields = Column(JSON, default=list)
    probable_root_causes = Column(JSON, default=list)
    capa_recommendations = Column(JSON, default=list)
    regulatory_flags = Column(JSON, default=list)
    ai_summary = Column(Text, default="")

    source_text = Column(Text, default="")
    source_name = Column(String(255), default="")

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
