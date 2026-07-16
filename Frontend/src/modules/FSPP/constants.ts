export const EXPENSE_OPTIONS_BIGHA = [
  { label: "Below ₹4,000 per bigha", points: 0 },
  { label: "₹4,000 to ₹5,999 per bigha", points: 10 },
  { label: "₹6,000 to ₹8,000 per bigha", points: 20, tag: "Target Profile" },
  { label: "Above ₹8,000 per bigha", points: 30 }
];

export const EXPENSE_OPTIONS_ACRES = [
  { label: "Below ₹10,000 per acre", points: 0 },
  { label: "₹10,000 to ₹14,999 per acre", points: 10 },
  { label: "₹15,000 to ₹20,000 per acre", points: 20, tag: "Target Profile" },
  { label: "Above ₹20,000 per acre", points: 30 }
];

export const BIO_OPTIONS = [
  { label: "No awareness - Purely chemical dependency", points: 0 },
  { label: "Heard of it, but never used", points: 5 },
  { label: "Modest awareness / Has experimented with basic bio-fertilizers", points: 10 },
  { label: "High awareness / Actively using biologicals", points: 15 }
];

export const GLS_OPTIONS = [
  { label: "No prior knowledge", points: 0 },
  { label: "Knows GLS only as a local brand name", points: 5 },
  { label: "Aware of GLS's extensive research legacy and product lines", points: 10 }
];

export const MINDSET_OPTIONS = [
  { label: "Disagree", points: 0, color: '#991B1B' },
  { label: "Neutral", points: 2, color: '#B45309' },
  { label: "Agree", points: 5, color: '#166534' }
];

export const MINDSET_STATEMENTS = [
  { key: 'mindsetA', label: "A. The farmer recognizes that chemical over-use harms long-term soil structure." },
  { key: 'mindsetB', label: "B. The farmer observes diminished returns / ill effects of chemical over-dosing on plants." },
  { key: 'mindsetC', label: "C. The farmer expresses genuine concern over impact of chemical residuals on human health." },
  { key: 'mindsetD', label: "D. The farmer is actively looking for immediate options to transition to biological products." }
];

export const getPointsForOption = (optionsArray: any[], selectedLabel: string) => {
  const option = optionsArray.find(opt => opt.label === selectedLabel);
  return option ? option.points : 0;
};
