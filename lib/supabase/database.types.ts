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
      portfolio_holdings: {
        Row: {
          asset_type: string
          avg_price: number
          created_at: string
          id: string
          quantity: number
          symbol: string
          updated_at: string
          user_id: string
        }
        Insert: {
          asset_type: string
          avg_price: number
          created_at?: string
          id?: string
          quantity: number
          symbol: string
          updated_at?: string
          user_id: string
        }
        Update: {
          asset_type?: string
          avg_price?: number
          created_at?: string
          id?: string
          quantity?: number
          symbol?: string
          updated_at?: string
          user_id?: string
        }
      }
      portfolio_shares: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          share_token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          share_token: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          share_token?: string
          user_id?: string
        }
      }
      portfolio_transactions: {
        Row: {
          executed_at: string
          holding_id: string
          id: string
          price: number
          quantity: number
          type: string
        }
        Insert: {
          executed_at?: string
          holding_id: string
          id?: string
          price: number
          quantity: number
          type: string
        }
        Update: {
          executed_at?: string
          holding_id?: string
          id?: string
          price?: number
          quantity?: number
          type?: string
        }
      }
      price_alerts: {
        Row: {
          asset_type: string
          created_at: string
          direction: string
          id: string
          symbol: string
          target_price: number
          triggered: boolean
          user_id: string
        }
        Insert: {
          asset_type: string
          created_at?: string
          direction: string
          id?: string
          symbol: string
          target_price: number
          triggered?: boolean
          user_id: string
        }
        Update: {
          asset_type?: string
          created_at?: string
          direction?: string
          id?: string
          symbol?: string
          target_price?: number
          triggered?: boolean
          user_id?: string
        }
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          currency: string
          display_name: string | null
          id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          currency?: string
          display_name?: string | null
          id?: string
        }
      }
      watchlist_assets: {
        Row: {
          added_at: string
          asset_type: string
          id: string
          position: number
          symbol: string
          watchlist_id: string
        }
        Insert: {
          added_at?: string
          asset_type: string
          id?: string
          position?: number
          symbol: string
          watchlist_id: string
        }
        Update: {
          added_at?: string
          asset_type?: string
          id?: string
          position?: number
          symbol?: string
          watchlist_id?: string
        }
      }
      watchlists: {
        Row: {
          created_at: string
          id: string
          name: string
          share_token: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          share_token?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          share_token?: string | null
          user_id?: string
        }
      }
    }
  }
}

export type Tables<K extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][K]["Row"]

export type TablesInsert<K extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][K]["Insert"]
