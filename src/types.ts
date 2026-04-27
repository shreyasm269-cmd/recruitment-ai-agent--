export enum CandidateStatus {
  Screening = 'Screening',
  Assessed = 'Assessed',
  Interviewing = 'Interviewing',
  Offered = 'Offered',
  Hired = 'Hired',
  Rejected = 'Rejected'
}

export type ApplicationStage = 'Resume Review' | 'Technical Assessment' | 'HR Round' | 'Final Interview';

export interface Job {
  id: string;
  title: string;
  department: string;
  location: string;
  minExp: number;
  maxExp: number;
  ctcRange: { min: number; max: number }; // in LPA
  skills: string[];
  description: string;
  createdAt: string;
  activeCandidates?: number;
  diversityGoal?: number;
}

export interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string;
  currentCTC: number;
  expectedCTC: number;
  noticePeriod: number; // in days
  totalExp: number;
  skills: string[];
  education: string;
  status: CandidateStatus;
  currentStage?: ApplicationStage | string;
  matchScore?: number;
  aiFeedback?: string;
  resumeUrl?: string;
  gender?: 'Male' | 'Female' | 'Other';
  experienceLevel?: 'Junior' | 'Mid' | 'Senior';
  successProbability?: number; // 0-100
  retentionRisk?: 'Low' | 'Medium' | 'High';
  culturalFitScore?: number;
  technicalAssessmentScore?: number;
  comments?: Array<{ author: string; text: string; date: string }>;
}

export interface AutomationRule {
  id: string;
  name: string;
  trigger: 'on_applied' | 'on_matched' | 'on_interview_complete';
  condition: string;
  action: 'move_to_stage' | 'send_email' | 'notify_slack';
  isActive: boolean;
}

export interface Interview {
  id: string;
  candidateId: string;
  jobId: string;
  type: 'Technical' | 'HR' | 'Managerial' | 'Final';
  date: string;
  time: string;
  interviewer: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  meetingLink?: string;
  notes?: string;
}

export interface InterviewFeedback {
  id: string;
  interviewId: string;
  interviewerId: string;
  rating: number; // 1-5
  technicalSkillsRating: number;
  culturalFitRating: number;
  communicationRating: number;
  pros: string[];
  cons: string[];
  decision: 'Strong Hire' | 'Hire' | 'Neutral' | 'No Hire';
  summary: string;
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ScreeningResult {
  matchScore: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  verdict: 'Excellent' | 'Good' | 'Average' | 'Poor';
  summary: string;
}
