import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    const {
        data: { user },
    } = await supabase.auth.getUser()

    // Protected Routes Logic - Verified
    const isPublicRoute =
        request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/signup') ||
        request.nextUrl.pathname.startsWith('/auth') ||
        request.nextUrl.pathname.startsWith('/access-denied');

    // 1. If no user and trying to access protected route (including root /)
    if (!user && !isPublicRoute) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // 2. If user exists, check approval status
    if (user) {
        // Fetch profile to check approval
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_approved, role, access_expiry')
            .eq('id', user.id)
            .single();

        // 2a. Check for Expiry
        const isSuperAdmin = user.email === 'team.celvix@gmail.com';

        // Strict Access Rule: Must have expiry date set and must be in future
        if (!isSuperAdmin && !request.nextUrl.pathname.startsWith('/access-denied')) {
            // If no expiry date is set, deny access
            if (!profile?.access_expiry) {
                const url = request.nextUrl.clone()
                url.pathname = '/access-denied'
                return NextResponse.redirect(url)
            }

            // If expiry date is passed, deny access
            const expiryDate = new Date(profile.access_expiry);
            const now = new Date();
            if (now > expiryDate) {
                const url = request.nextUrl.clone()
                url.pathname = '/access-denied'
                return NextResponse.redirect(url)
            }
        }

        // If not approved and not on access-denied page, redirect
        if (profile && !profile.is_approved && !request.nextUrl.pathname.startsWith('/access-denied')) {
            // Allow signing out (which calls /auth/signout usually, handled by public route check above if path is /auth)
            // But if they are just navigating, send them to access-denied
            const url = request.nextUrl.clone()
            url.pathname = '/access-denied'
            return NextResponse.redirect(url)
        }

        // If on access-denied page, check if they should be allowed in
        if (request.nextUrl.pathname.startsWith('/access-denied')) {
            const hasFutureExpiry = profile?.access_expiry && new Date(profile.access_expiry) > new Date();
            const isAdmin = user.email === 'team.celvix@gmail.com';

            // Only redirect to home IF:
            // 1. They are Super Admin
            // OR
            // 2. They are Approved AND have a Future Expiry date
            if (isAdmin || (profile?.is_approved && hasFutureExpiry)) {
                const url = request.nextUrl.clone()
                url.pathname = '/'
                return NextResponse.redirect(url)
            }
        }

        // 3. Dashboard Admin Access Check
        if (request.nextUrl.pathname.startsWith('/dashboard')) {
            // STRICT CHECK: Only team.celvix@gmail.com can access dashboard
            if (user.email !== 'team.celvix@gmail.com') {
                const url = request.nextUrl.clone()
                url.pathname = '/'
                return NextResponse.redirect(url)
            }

            if (profile?.role !== 'admin') {
                // Logged in but not admin -> Redirect to Home
                const url = request.nextUrl.clone()
                url.pathname = '/'
                return NextResponse.redirect(url)
            }
        }
    }

    return response
}
