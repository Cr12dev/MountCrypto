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
          id: string
          user_id: string
          symbol: string
          asset_type: string
          target_price: number
          direction: "above" | "below"
          triggered: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          symbol: string
          asset_type: string
          target_price: number
          direction: "above" | "below"
          triggered?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          symbol?: string
          asset_type?: string
          target_price?: number
          direction?: "above" | "below"
          triggered?: boolean
          created_at?: string
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
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
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
