import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  const protectedPaths = ["/dashboard", "/groups", "/treasurer", "/payments", "/settings"];
  const isProtected = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );

  if (!session && isProtected) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};


// import { createServerClient } from "@supabase/ssr";
// import { NextResponse, type NextRequest } from "next/server";

// export async function middleware(request: NextRequest) {
//   // Create a response
//   let response = NextResponse.next({ request });

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return request.cookies.getAll();
//         },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value, options }) =>
//             request.cookies.set(name, value)
//           );
//           response = NextResponse.next({ request });
//           cookiesToSet.forEach(({ name, value, options }) =>
//             response.cookies.set(name, value, options)
//           );
//         },
//       },
//     }
//   );

//   // Get user
//   const { data: { user } } = await supabase.auth.getUser();

//   // Paths that need authentication
//   const protectedPaths = ["/dashboard", "/groups", "/treasurer", "/payments", "/settings"];
//   const isProtected = protectedPaths.some(path => 
//     request.nextUrl.pathname.startsWith(path)
//   );

//   // Redirect to login if not authenticated and trying to access protected route
//   if (!user && isProtected) {
//     return NextResponse.redirect(new URL("/login", request.url));
//   }

//   return response;
// }

// export const config = {
//   matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
// };




// import { createServerClient } from "@supabase/ssr";
// import { NextResponse, type NextRequest } from "next/server";

// export async function middleware(request: NextRequest) {
//   let supabaseResponse = NextResponse.next({ request });

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() {
//           return request.cookies.getAll();
//         },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value, options }) =>
//             request.cookies.set(name, value)
//           );
//           supabaseResponse = NextResponse.next({ request });
//           cookiesToSet.forEach(({ name, value, options }) =>
//             supabaseResponse.cookies.set(name, value, options)
//           );
//         },
//       },
//     }
//   );

//   const {
//     data: { user },
//   } = await supabase.auth.getUser();

//   // Protect dashboard routes
//   if (
//     !user &&
//     request.nextUrl.pathname.startsWith("/dashboard") ||
//     request.nextUrl.pathname.startsWith("/groups") ||
//     request.nextUrl.pathname.startsWith("/treasurer") ||
//     request.nextUrl.pathname.startsWith("/payments")
//   ) {
//     const url = request.nextUrl.clone();
//     url.pathname = "/login";
//     return NextResponse.redirect(url);
//   }

//   return supabaseResponse;
// }

// export const config = {
//   matcher: [
//     "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
//   ],
// };