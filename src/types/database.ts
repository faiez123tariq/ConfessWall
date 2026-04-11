export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          status: string
          created_at: string
          ended_at: string | null
        }
        Insert: {
          id?: string
          status?: string
          created_at?: string
          ended_at?: string | null
        }
        Update: {
          id?: string
          status?: string
          created_at?: string
          ended_at?: string | null
        }
        Relationships: []
      }
      attendees: {
        Row: {
          id: string
          session_id: string
          name: string
          email: string
          gender: string
          joined_at: string
          email_sent: boolean
        }
        Insert: {
          id?: string
          session_id: string
          name: string
          email: string
          gender: string
          joined_at?: string
          email_sent?: boolean
        }
        Update: {
          id?: string
          session_id?: string
          name?: string
          email?: string
          gender?: string
          joined_at?: string
          email_sent?: boolean
        }
        Relationships: [
          {
            foreignKeyName: 'attendees_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
        ]
      }
      confessions: {
        Row: {
          id: string
          session_id: string
          attendee_id: string
          text: string
          chaos_score: number | null
          ai_roast: string | null
          upvotes: number
          deleted: boolean
          created_at: string
        }
        Insert: {
          id?: string
          session_id: string
          attendee_id: string
          text: string
          chaos_score?: number | null
          ai_roast?: string | null
          upvotes?: number
          deleted?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          attendee_id?: string
          text?: string
          chaos_score?: number | null
          ai_roast?: string | null
          upvotes?: number
          deleted?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'confessions_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'confessions_attendee_id_fkey'
            columns: ['attendee_id']
            isOneToOne: false
            referencedRelation: 'attendees'
            referencedColumns: ['id']
          },
        ]
      }
      upvotes: {
        Row: {
          id: string
          confession_id: string
          attendee_id: string
          created_at: string
        }
        Insert: {
          id?: string
          confession_id: string
          attendee_id: string
          created_at?: string
        }
        Update: {
          id?: string
          confession_id?: string
          attendee_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'upvotes_confession_id_fkey'
            columns: ['confession_id']
            isOneToOne: false
            referencedRelation: 'confessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'upvotes_attendee_id_fkey'
            columns: ['attendee_id']
            isOneToOne: false
            referencedRelation: 'attendees'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
