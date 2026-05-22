import { getSupabaseClient } from './supabase';

export interface UserAccount {
    username: string;
    passwordHash: string;
    createdAt: string;
}

// Password Hashing helper (SHA-256)
async function hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Register Account
export async function registerUser(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (typeof window === 'undefined') return { success: false };

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3) {
        return { success: false, error: 'Username must be at least 3 characters long.' };
    }
    if (password.length < 6) {
        return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    try {
        const supabase = getSupabaseClient();

        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('movora_users')
            .select('username')
            .eq('username', cleanUsername)
            .maybeSingle();

        if (checkError) {
            console.error('Error checking user:', checkError);
        }

        if (existingUser) {
            return { success: false, error: 'Username is already taken.' };
        }

        const passwordHash = await hashPassword(password);

        // Insert new user record
        const { error: insertError } = await supabase
            .from('movora_users')
            .insert([{ 
                username: cleanUsername, 
                password_hash: passwordHash, 
                liked_list: [], 
                watchlist: [],
                watch_history: [],
                search_history: []
            }]);

        if (insertError) {
            console.error('Error inserting user:', insertError);
            return { success: false, error: 'Failed to write account records to Supabase.' };
        }

        // Auto-login after registration
        localStorage.setItem('movora_current_user', cleanUsername);
        localStorage.setItem('watch_username', cleanUsername); // Seamless Watch Together sync!
        localStorage.setItem('watchlist', '[]');

        window.dispatchEvent(new Event('movora_auth_change'));
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Database connection failed.' };
    }
}

// Login Account
export async function loginUser(username: string, password: string): Promise<{ success: boolean; error?: string }> {
    if (typeof window === 'undefined') return { success: false };

    const cleanUsername = username.trim().toLowerCase();
    
    try {
        const supabase = getSupabaseClient();

        // Retrieve user record
        const { data: user, error: fetchError } = await supabase
            .from('movora_users')
            .select('*')
            .eq('username', cleanUsername)
            .maybeSingle();

        if (fetchError || !user) {
            return { success: false, error: 'Incorrect username or password.' };
        }

        const passwordHash = await hashPassword(password);
        if (user.password_hash !== passwordHash) {
            return { success: false, error: 'Incorrect username or password.' };
        }

        localStorage.setItem('movora_current_user', cleanUsername);
        localStorage.setItem('watch_username', cleanUsername); // Seamless Watch Together sync!
        
        // Sync lists from retrieved Supabase record to LocalStorage 'watchlist' key
        if (user.watchlist) {
            localStorage.setItem('watchlist', JSON.stringify(user.watchlist));
        }
        
        // Sync watch history
        if (user.watch_history) {
            localStorage.setItem('viewHistory', JSON.stringify(user.watch_history));
        }
        
        // Sync search history
        if (user.search_history) {
            localStorage.setItem('searchHistory', JSON.stringify(user.search_history));
        }

        window.dispatchEvent(new Event('movora_auth_change'));
        return { success: true };
    } catch (e) {
        console.error(e);
        return { success: false, error: 'Database authentication failed.' };
    }
}

// Logout Account
export function logoutUser() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('movora_current_user');
    localStorage.removeItem('watch_username');
    localStorage.removeItem('watchlist'); // Clear user watchlist
    window.dispatchEvent(new Event('movora_auth_change'));
}

// Get Active Session
export function getCurrentUser(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('movora_current_user');
}

// Helper to push user lists to Supabase
export async function pushUserDataToSupabase(username: string, watchlist: any[], watchHistory?: any[], searchHistory?: string[]) {
    try {
        const supabase = getSupabaseClient();
        const updateData: any = { watchlist };
        
        if (watchHistory !== undefined) {
            updateData.watch_history = watchHistory;
        }
        
        if (searchHistory !== undefined) {
            updateData.search_history = searchHistory;
        }
        
        const { error } = await supabase
            .from('movora_users')
            .update(updateData)
            .eq('username', username.toLowerCase());
            
        if (error) {
            console.error('Error updating user data in Supabase:', error);
        }
    } catch (e) {
        console.error('Failed to update user data in Supabase:', e);
    }
}

// Helper to fetch user lists from Supabase
export async function syncUserDataWithSupabase(username: string) {
    if (typeof window === 'undefined' || !username) return;
    try {
        const supabase = getSupabaseClient();
        const { data: user, error } = await supabase
            .from('movora_users')
            .select('watchlist, watch_history, search_history')
            .eq('username', username.toLowerCase())
            .maybeSingle();

        if (!error && user) {
            if (user.watchlist) {
                localStorage.setItem('watchlist', JSON.stringify(user.watchlist));
            }
            if (user.watch_history) {
                localStorage.setItem('viewHistory', JSON.stringify(user.watch_history));
            }
            if (user.search_history) {
                localStorage.setItem('searchHistory', JSON.stringify(user.search_history));
            }
            window.dispatchEvent(new Event('movora_userdata_change'));
        }
    } catch (e) {
        console.error('Failed to sync user data from Supabase:', e);
    }
}

// Clear watch history
export async function clearWatchHistory(username: string) {
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('movora_users')
            .update({ watch_history: [] })
            .eq('username', username.toLowerCase());
            
        if (error) {
            console.error('Error clearing watch history:', error);
            return false;
        }
        
        localStorage.setItem('viewHistory', '[]');
        window.dispatchEvent(new Event('movora_userdata_change'));
        return true;
    } catch (e) {
        console.error('Failed to clear watch history:', e);
        return false;
    }
}

// Clear search history
export async function clearSearchHistory(username: string) {
    try {
        const supabase = getSupabaseClient();
        const { error } = await supabase
            .from('movora_users')
            .update({ search_history: [] })
            .eq('username', username.toLowerCase());
            
        if (error) {
            console.error('Error clearing search history:', error);
            return false;
        }
        
        localStorage.setItem('searchHistory', '[]');
        window.dispatchEvent(new Event('movora_userdata_change'));
        return true;
    } catch (e) {
        console.error('Failed to clear search history:', e);
        return false;
    }
}
