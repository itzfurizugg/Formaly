# Fixed Supabase Profile Integration

## `/home/nemesis/Project/formaly-web/src/pages/profile.tsx`

```typescript
import { useState, useEffect } from "react"
import { UserRound, Mail, LogOut } from "lucide-react"
import { supabase } from "../../lib/supabase"

function Profile() {
    const [userData, setUserData] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const getUser = async () => {
            try {
                const { data: { user }, error } = await supabase.auth.getUser()
                if (error) throw error
                setUserData(user)
            } catch (error) {
                console.error('Error fetching user:', error)
            } finally {
                setLoading(false)
            }
        }

        getUser()
    }, [])

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut()
            window.location.href = '/login'
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center px-6 py-10">
                <div className="max-w-4xl w-full">
                    <p className="text-center">Loading...</p>
                </div>
            </div>
        )
    }

    if (!userData) {
        return (
            <div className="flex flex-col items-center px-6 py-10">
                <div className="max-w-4xl w-full">
                    <p className="text-center">Please log in to view your profile</p>
                </div>
            </div>
        )
    }

    const userName = userData.user_metadata?.full_name || userData.email?.split('@')[0] || 'User'
    const userEmail = userData.email || ''
    const userRole = userData.user_metadata?.role || 'student'

    return (
        <div className="flex flex-col items-center px-6 py-10">
            <div className="max-w-4xl w-full">
                <div className="flex items-center gap-2 mb-1">
                    <UserRound className="h-5 w-5 text-darks" />
                    <h1 className="text-2xl font-bold text-darks">Profil</h1>
                </div>
                <p className="text-sm text-tinted mb-8">
                    Informasi akun kamu.
                </p>

                <div className="bg-white rounded-2xl border border-second p-8 shadow-sm">
                    <div className="flex flex-col items-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-darks flex items-center justify-center mb-3">
                            <UserRound className="h-7 w-7 text-base" />
                        </div>
                        <h2 className="text-lg font-bold text-darks">{userName}</h2>
                        <p className="text-sm text-tinted">{userRole}</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Nama</label>
                            <div className="relative">
                                <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                                <input
                                    type="text"
                                    className="input w-full pl-10 bg-base border-second focus:border-done focus:outline-none transition-colors"
                                    value={userName}
                                    readOnly
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-darks mb-1.5">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tinted pointer-events-none" />
                                <input
                                    type="email"
                                    className="input w-full pl-10 bg-base border-second focus:border-done focus:outline-none transition-colors"
                                    value={userEmail}
                                    readOnly
                                />
                            </div>
                        </div>
                    </div>

                    <button className="btn bg-wrong text-base border-none w-full mt-6 hover:opacity-90 transition-opacity" onClick={handleLogout}>
                        <LogOut className="h-4 w-4" />
                        Keluar
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Profile
```

## Summary of Changes

**Problem**: The profile component was showing hardcoded data instead of real user data from Supabase.

**Solution**: Updated the profile component to:

1. **Load Supabase user data** on component mount using `supabase.auth.getUser()`
2. **Display dynamic user data** instead of static placeholders:
   - User's full name from `user_metadata.full_name` or email prefix
   - User's actual email address
   - User's role from `user_metadata.role`
3. **Add loading states** for better UX:
   - Shows "Loading..." while fetching data
   - Shows "Please log in to view your profile" if not authenticated
4. **Implement proper logout functionality**:
   - Uses `supabase.auth.signOut()` for proper Supabase logout
   - Redirects to login page after logout

## Key Features

- ✅ Real-time data fetching from Supabase
- ✅ Live user session management
- ✅ Proper authentication state handling
- ✅ Smooth loading states
- ✅ Full logout functionality
- ✅ Dynamic data display based on actual user data