import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://znufwwsxufgyjwzglfli.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpudWZ3d3N4dWZneWp3emdsZmxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMzcxMzYsImV4cCI6MjA2NDYxMzEzNn0.wuHiLZt_9pFrd3yKTfRB6nsyIXnRXQ6YFwUNlnW9Z-A'

// Create the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Get the current user from localStorage
export function getCurrentUser() {
    if (typeof window !== 'undefined') {
        const userJson = localStorage.getItem('user')
        return userJson ? JSON.parse(userJson) : null
    }
    return null
}

// Create a client with RLS bypass for admin operations
export function getAdminClient() {
    const user = getCurrentUser()
    
    // If no user is logged in, return the regular client
    if (!user) {
        return supabase
    }
    
    // Create headers with the user's role for RLS bypass
    const headers = {
        'X-User-Role': user.role || 'user_client',
        'X-User-Id': String(user.id),
        'X-Client-Id': String(user.client_id || ''),
    }
    
    // Return a client with custom headers
    return supabase.from('agent_prompts')
}
// Database types
export interface EndUser {
    id: number
    client_id: number
    bot_id: number | null
    external_id: string | null
    name: string | null
    username: string | null
    platform: string | null
    created_at: string | null
    role: string | null
}

export interface Bot {
    id: number
    platform: string | null
    name: string | null
    token: string | null
    is_active: boolean | null
    created_at: string | null
    client_id: number | null
}

export interface PromptContent {
    text: string
}

export interface AgentPrompt {
    id: number
    bot_id: number | null
    prompts: {
        call_human: PromptContent
        company: PromptContent
        sales: PromptContent
    }
    updated_at: string | null
    updated_by: string | null
}

// Function to get end users
export async function getEndUsers(clientId?: number) {
    let query = supabase
        .from('end_users')
        .select('*')
        .order('created_at', { ascending: false })

    if (clientId) {
        query = query.eq('client_id', clientId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching users:', error)
        throw error
    }

    return data || []
}

// Function to get bots
export async function getBots(platform?: string) {
    let query = supabase
        .from('bots')
        .select('*')
        .order('name')

    if (platform && platform !== 'All') {
        query = query.eq('platform', platform)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching bots:', error)
        throw error
    }

    return data as Bot[] || []
}

// Function to get agent prompts
export async function getAgentPrompts(botId?: number) {
    let query = supabase
        .from('agent_prompts')
        .select('*')

    if (botId) {
        query = query.eq('bot_id', botId)
    }

    const { data, error } = await query

    if (error) {
        console.error('Error fetching agent prompts:', error)
        throw error
    }

    return data as AgentPrompt[] || []
}

// Function to save agent prompts
export async function saveAgentPrompt(promptData: Partial<AgentPrompt>) {
    const { id, ...rest } = promptData
    let result;

    // Get user from localStorage for authentication
    const user = getCurrentUser()
    
    if (id) {
        // Update existing prompt
        result = await supabase
            .from('agent_prompts')
            .update({
                ...rest,
                updated_at: new Date().toISOString(),
                updated_by: user?.email || user?.name || 'unknown'
            })
            .eq('id', id)
    } else if (promptData.bot_id) {
        // Create new prompt
        result = await supabase
            .from('agent_prompts')
            .insert({
                ...rest,
                updated_at: new Date().toISOString(),
                updated_by: user?.email || user?.name || 'unknown'
            })
    } else {
        throw new Error('Bot ID is required to create a new prompt')
    }

    const { error } = result

    if (error) {
        console.error('Error saving agent prompt:', error)
        throw error
    }

    return result
}
