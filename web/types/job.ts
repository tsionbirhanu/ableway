export interface JobListing {
  id: string;
  employerName: string;
  employerVerified: boolean;
  title: string;
  location: string;
  isRemote: boolean;
  jobType: "full-time" | "part-time" | "contract" | "internship";
  summary: string;
  description: string;
  requiredSkills: string[];
  accommodationsOffered: string[]; // e.g. "Screen reader tested tools", "Flexible hours"
  postedDate: string;
  deadlineDate?: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  employerName: string;
  status: "submitted" | "viewed" | "shortlisted" | "interview" | "offer" | "rejected";
  appliedDate: string;
}

export interface CVProfile {
  id: string;
  userId: string;
  summary: string;
  skills: string[];
  workExperience: {
    title: string;
    organization: string;
    duration: string;
    responsibilities: string;
  }[];
  education: {
    institution: string;
    credential: string;
    year: string;
  }[];
}
