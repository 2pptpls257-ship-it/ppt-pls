import { Router, type IRouter } from "express";
import { GetCatalogResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const preClinicalPrices = [
  { id: "pre-10-15", label: "Essentials", slides: "10–15", usd: 2.99, inr: 249, gel: 8.2 },
  { id: "pre-15-25", label: "Complete", slides: "15–25", usd: 4.99, inr: 419, gel: 13.7 },
  { id: "pre-25-30", label: "Deep dive", slides: "25–30", usd: 5.99, inr: 499, gel: 16.5 },
];

const paraClinicalPrices = [
  { id: "para-10-15", label: "Essentials", slides: "10–15", usd: 3.99, inr: 329, gel: 10.9 },
  { id: "para-15-25", label: "Complete", slides: "15–25", usd: 5.99, inr: 499, gel: 16.5 },
  { id: "para-25-30", label: "Deep dive", slides: "25–30", usd: 6.99, inr: 579, gel: 19.2 },
];

const clinicalPrices = [
  { id: "clinical-10-15", label: "Essentials", slides: "10–15", usd: 4.99, inr: 419, gel: 13.7 },
  { id: "clinical-15-25", label: "Complete", slides: "15–25", usd: 6.99, inr: 579, gel: 19.2 },
  { id: "clinical-25-30", label: "Deep dive", slides: "25–30", usd: 7.99, inr: 669, gel: 22.0 },
];

router.get("/catalog", (_req, res) => {
  res.json(
    GetCatalogResponse.parse({
      currencies: ["USD", "INR", "GEL"],
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
    }),
  );
});

export default router;