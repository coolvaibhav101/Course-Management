import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  console.log("req", req);

  const response = await fetch(
    "https://student-portal-wh5i.onrender.com/api/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = await response.json();

  return NextResponse.json(data, {
    status: response.status,
  });
}

// // app/api/[...path]/route.ts
// // This handles ALL API routes dynamically

// import { NextRequest, NextResponse } from "next/server";

// const BACKEND_URL =
//   process.env.BACKEND_API_URL || "https://student-portal-wh5i.onrender.com/api";

// async function handler(
//   request: NextRequest,
//   context: { params: Promise<{ path: string[] }> }
// ) {
//   try {
//     // Await params in Next.js 15+
//     const params = await context.params;

//     // Get the full path from the catch-all route
//     const path = params.path?.join("/") || "";

//     // Build the backend URL with query params
//     const searchParams = request.nextUrl.searchParams.toString();
//     const queryString = searchParams ? `?${searchParams}` : "";
//     const url = `${BACKEND_URL}/${path}${queryString}`;

//     console.log(`Proxying ${request.method} request to: ${url}`);

//     // Get request body if it exists
//     let body;
//     if (request.method !== "GET" && request.method !== "HEAD") {
//       try {
//         const text = await request.text();
//         body = text || null;
//       } catch {
//         body = null;
//       }
//     }

//     // Forward headers
//     const headers: HeadersInit = {
//       "Content-Type": "application/json",
//     };

//     // Forward Authorization header if present
//     const authHeader = request.headers.get("authorization");
//     if (authHeader) {
//       headers["Authorization"] = authHeader;
//     }

//     // Make the request to your backend
//     const response = await fetch(url, {
//       method: request.method,
//       headers,
//       body: body || undefined,
//     });
//     console.log("response", response);

//     // Parse response
//     let data;
//     const contentType = response.headers.get("content-type");

//     if (contentType?.includes("application/json")) {
//       data = await response.json();
//     } else {
//       data = await response.text();
//     }
//     // Return the response with same status code
//     return NextResponse.json(data, {
//       status: response.status,
//       headers: {
//         "Content-Type": "application/json",
//       },
//     });
//   } catch (error) {
//     console.error("API Proxy Error:", error);

//     return NextResponse.json(
//       {
//         message: "Internal server error",
//         error: error instanceof Error ? error.message : "Unknown error",
//       },
//       { status: 500 }
//     );
//   }
// }

// export {
//   handler as GET,
//   handler as POST,
//   handler as PUT,
//   handler as DELETE,
//   handler as PATCH,
// };
