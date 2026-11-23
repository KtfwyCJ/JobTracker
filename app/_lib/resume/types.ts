export type ProfileId = 'ai-engineer' | 'senior-fullstack' | 'senior-frontend'
export const PROFILE_IDS: ProfileId[] = ['ai-engineer', 'senior-fullstack', 'senior-frontend']

export interface Bullet { id: string; text: string; profiles: ProfileId[]; bold: string[] }
export interface Experience { id: string; company: string; location: string; role: string; dates: string; bullets: Bullet[] }
export interface Profile { id: ProfileId; title: string; summary: string; skillGroups: string[] }
export interface SkillGroup { id: string; label: string; items: string[] }

export interface Evidence {
  contact: { name: string; location: string; email?: string; phone?: string; github?: string; linkedin?: string; website?: string }
  profiles: Profile[]
  experiences: Experience[]
  education: { id: string; school: string; location: string; degree: string; dates: string; notes: string[] }[]
  research: { id: string; title: string; venue: string; topic: string; text: string }[]
  skillGroups: SkillGroup[]
  languages: { name: string; level: string }[]
  interests: { name: string; text: string }[]
  aliases: Record<string, string[]>
}

export interface Plan {
  profile: ProfileId
  experiences: { experienceId: string; bulletIds: string[] }[]
  bold: { bulletId: string; terms: string[] }[]
  skillGroups: { groupId: string; items: string[] }[] // array order = group order
}

export interface LlmPlan extends Plan { profileReason: string; fit: 'good' | 'low' }

export interface JdRequirement { text: string; keywords: string[] }
export interface JdAnalysis {
  title?: string; company?: string; level?: string; location?: string
  skills?: string[]; requirements?: string[]; niceToHave?: string[]
  mustHave: JdRequirement[]; plus: JdRequirement[]; keywords: string[]
}
