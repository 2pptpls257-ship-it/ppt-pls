const preClinicalPrices = [
  { id: "pre-10-15", label: "Essentials", slides: "10–15", usd: 2.99, inr: 249 },
  { id: "pre-15-25", label: "Complete", slides: "15–25", usd: 4.99, inr: 419 },
  { id: "pre-25-30", label: "Deep dive", slides: "25–30", usd: 5.99, inr: 499 },
];

const paraClinicalPrices = [
  { id: "para-10-15", label: "Essentials", slides: "10–15", usd: 3.99, inr: 329 },
  { id: "para-15-25", label: "Complete", slides: "15–25", usd: 5.99, inr: 499 },
  { id: "para-25-30", label: "Deep dive", slides: "25–30", usd: 6.99, inr: 579 },
];

const clinicalPrices = [
  { id: "clinical-10-15", label: "Essentials", slides: "10–15", usd: 4.99, inr: 419 },
  { id: "clinical-15-25", label: "Complete", slides: "15–25", usd: 6.99, inr: 579 },
  { id: "clinical-25-30", label: "Deep dive", slides: "25–30", usd: 7.99, inr: 669 },
];

const catalog = {
  currencies: ["USD", "INR"],
  groups: [
    {
      id: "pre-clinical",
      label: "Pre-clinical sciences",
      description: "The foundations: structure, function, and the chemistry of life.",
      subjects: ["Anatomy", "Physiology", "Biochemistry"],
      prices: preClinicalPrices,
    },
    {
      id: "para-clinical",
      label: "Para-clinical sciences",
      description: "The bridge between foundational knowledge and the ward.",
      subjects: ["Pathology", "Pharmacology", "Microbiology", "Forensic Medicine"],
      prices: paraClinicalPrices,
    },
    {
      id: "clinical",
      label: "Clinical subjects",
      description: "Patient-facing disciplines, from diagnosis to emergency care.",
      subjects: [
        "General Medicine",
        "Dermatology",
        "Psychiatry",
        "Neurology",
        "Cardiology",
        "Respiratory Medicine",
        "Gastroenterology",
        "Nephrology",
        "General Surgery",
        "Orthopedics",
        "Urology",
        "Neurosurgery",
        "Obstetrics",
        "Gynecology",
        "Pediatrics",
        "Ophthalmology",
        "ENT",
        "Emergency Medicine",
        "Others",
      ],
      prices: clinicalPrices,
    },
  ],
};

export default function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  res.status(200).json(catalog);
}
