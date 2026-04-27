import React from 'react';
import { Job, Candidate, CandidateStatus, AutomationRule, Interview } from './types';

export const MOCK_JOBS: Job[] = [
  {
    id: '1',
    title: 'Senior Full Stack Developer',
    department: 'Engineering',
    location: 'Bangalore (Remote)',
    minExp: 5,
    maxExp: 8,
    ctcRange: { min: 25, max: 45 },
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
    description: 'Looking for a product-minded developer to lead our core architecture.',
    createdAt: new Date().toISOString(),
    activeCandidates: 24,
    diversityGoal: 40
  },
  {
    id: '2',
    title: 'Backend Engineer (Python)',
    department: 'Platform',
    location: 'Pune',
    minExp: 3,
    maxExp: 6,
    ctcRange: { min: 18, max: 32 },
    skills: ['Python', 'FastAPI', 'Redis', 'Docker'],
    description: 'Scale our high-throughput recruitment APIs.',
    createdAt: new Date().toISOString(),
    activeCandidates: 18,
    diversityGoal: 35
  }
];

export const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'c1',
    name: 'Arjun Mehta',
    email: 'arjun.m@example.com',
    phone: '+91 98765 43210',
    currentCTC: 22,
    expectedCTC: 30,
    noticePeriod: 60,
    totalExp: 6,
    skills: ['React', 'Node.js', 'JavaScript'],
    education: 'B.Tech - IIT Bombay',
    status: CandidateStatus.Screening,
    currentStage: 'Resume Review',
    matchScore: 85,
    gender: 'Male',
    experienceLevel: 'Senior',
    successProbability: 88,
    retentionRisk: 'Low',
    culturalFitScore: 90,
    technicalAssessmentScore: 85,
    comments: [
      { author: 'Neha (HR)', text: 'Excellent communication during initial touchbase.', date: '2026-04-20' }
    ],
    aiFeedback: 'Strong technical pedigree with relevant stack experience. High potential for lead role.'
  },
  {
    id: 'c2',
    name: 'Priya Sharma',
    email: 'p.sharma@example.com',
    phone: '+91 87654 32109',
    currentCTC: 15,
    expectedCTC: 20,
    noticePeriod: 30,
    totalExp: 4,
    skills: ['Python', 'Django', 'REST APIs'],
    education: 'M.Tech - BITS Pilani',
    status: CandidateStatus.Interviewing,
    currentStage: 'Technical Assessment',
    matchScore: 92,
    gender: 'Female',
    experienceLevel: 'Mid',
    successProbability: 94,
    retentionRisk: 'Low',
    culturalFitScore: 95,
    technicalAssessmentScore: 92,
    comments: [],
    aiFeedback: 'Exceptional problem solver. Notice period is a plus for immediate needs.'
  }
];

export const MOCK_AUTOMATIONS: AutomationRule[] = [
  {
    id: '1',
    name: 'Auto-Shortlist Elite React Devs',
    trigger: 'on_applied',
    condition: 'Match Score > 90% and IIT/BITS education',
    action: 'move_to_stage',
    isActive: true
  },
  {
    id: '2',
    name: 'Schedule Interview for Backend Stars',
    trigger: 'on_matched',
    condition: 'Python & FastAPI skill verified',
    action: 'send_email',
    isActive: false
  }
];

export const MOCK_INTERVIEWS: Interview[] = [
  {
    id: 'i1',
    candidateId: 'c1',
    jobId: '1',
    type: 'Technical',
    date: '2026-05-01',
    time: '10:00 AM',
    interviewer: 'Rakesh Verma (Senior Dev)',
    status: 'Scheduled',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    notes: 'Focus on React internals and system design.'
  },
  {
    id: 'i2',
    candidateId: 'c2',
    jobId: '2',
    type: 'Technical',
    date: '2026-05-02',
    time: '02:30 PM',
    interviewer: 'Sanjana Rao (Tech Lead)',
    status: 'Scheduled',
    meetingLink: 'https://zoom.us/j/123456789',
    notes: 'Verify Python expertise and scalability patterns.'
  }
];
