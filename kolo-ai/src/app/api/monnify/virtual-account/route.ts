import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { groupId, amount } = await req.json();
    const reference = `SC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

    let virtualAccount = null;

    // Try real Monnify API with 3-second timeout
    try {
      const authString = Buffer.from(
        `${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`
      ).toString("base64");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const tokenResponse = await fetch("https://sandbox.monnify.com/api/v1/auth/login", {
        method: "POST",
        headers: { "Authorization": `Basic ${authString}`, "Content-Type": "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        const accessToken = tokenData.responseBody?.accessToken;

        if (accessToken) {
          const controller2 = new AbortController();
          const timeoutId2 = setTimeout(() => controller2.abort(), 3000);

          const accountResponse = await fetch(
            "https://sandbox.monnify.com/api/v1/bank-transfer/reserved-accounts",
            {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                accountReference: reference,
                accountName: `KoloAI / ${userName}`,
                currencyCode: "NGN",
                contractCode: process.env.MONNIFY_CONTRACT_CODE,
                customerEmail: user.email || "user@example.com",
                customerName: userName,
                getAllAvailableBanks: false,
                preferredBanks: ["035"],
              }),
              signal: controller2.signal,
            }
          );
          clearTimeout(timeoutId2);

          if (accountResponse.ok) {
            const accountData = await accountResponse.json();
            if (accountData.requestSuccessful && accountData.responseBody?.accounts?.length > 0) {
              const account = accountData.responseBody.accounts[0];
              virtualAccount = {
                bankName: account.bankName,
                accountNumber: account.accountNumber,
                accountName: account.accountName,
                reference,
              };
              console.log("✅ Real Monnify account:", account.accountNumber);
            }
          }
        }
      }
    } catch (err: any) {
      console.log("⚡ Monnify timed out (3s), using demo account");
    }

    // Fallback to demo account
    if (!virtualAccount) {
      virtualAccount = {
        bankName: "Wema Bank",
        accountNumber: `803${Math.floor(1000000 + Math.random() * 9000000)}`,
        accountName: `KoloAI / ${userName}`,
        reference,
      };
    }

    // Save contribution to database
    if (groupId) {
      await supabase.from("contributions").insert({
        amount: amount || 50000,
        status: "pending",
        group_id: groupId,
        user_id: user.id,
        transaction_ref: reference,
      });
    }

    return NextResponse.json({ success: true, account: virtualAccount, reference });
  } catch (error: any) {
    console.error("Virtual account error:", error.message);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}




// import { NextRequest, NextResponse } from "next/server";
// import { createServerSupabase } from "@/lib/supabase/server";

// export async function POST(req: NextRequest) {
//   try {
//     const supabase = await createServerSupabase();
//     const { data: { user } } = await supabase.auth.getUser();
//     if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//     const { groupId, amount } = await req.json();
//     const reference = `SC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
//     const userName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User";

//     // 🔥 CALL REAL MONNIFY API
//     let virtualAccount;
    
//     try {
//       // Step 1: Get Monnify token
//       const tokenResponse = await fetch("https://sandbox.monnify.com/api/v1/auth/login", {
//         method: "POST",
//         headers: {
//           "Authorization": `Basic ${Buffer.from(`${process.env.MONNIFY_API_KEY}:${process.env.MONNIFY_SECRET_KEY}`).toString("base64")}`,
//           "Content-Type": "application/json",
//         },
//       });
//       const tokenData = await tokenResponse.json();
//       const accessToken = tokenData.responseBody?.accessToken;

//       if (!accessToken) throw new Error("Failed to get Monnify token");

//       // Step 2: Create Reserved Account
//       const accountResponse = await fetch("https://sandbox.monnify.com/api/v1/bank-transfer/reserved-accounts", {
//         method: "POST",
//         headers: {
//           "Authorization": `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           accountReference: reference,
//           accountName: `SaveCircle / ${userName}`,
//           currencyCode: "NGN",
//           contractCode: process.env.MONNIFY_CONTRACT_CODE,
//           customerEmail: user.email,
//           customerName: userName,
//           getAllAvailableBanks: false,
//           preferredBanks: ["035", "232"], // Wema (035), Sterling (232)
//         }),
//       });
//       const accountData = await accountResponse.json();

//       if (accountData.requestSuccessful && accountData.responseBody?.accounts?.length > 0) {
//         const account = accountData.responseBody.accounts[0];
//         virtualAccount = {
//           bankName: account.bankName,
//           accountNumber: account.accountNumber,
//           accountName: account.accountName,
//           reference,
//         };
//         console.log("✅ Real Monnify account created:", account.accountNumber);
//       } else {
//         console.log("⚠️ Monnify response:", accountData);
//         throw new Error("Monnify did not return accounts");
//       }
//     } catch (err) {
//       console.log("⚠️ Monnify API failed, using demo account:", err);
//       // Fallback to demo account
//       virtualAccount = {
//         bankName: "Wema Bank (Demo)",
//         accountNumber: `803${Math.floor(1000000 + Math.random() * 9000000)}`,
//         accountName: `SaveCircle / ${userName}`,
//         reference,
//       };
//     }

//     // Save contribution to database
//     if (groupId) {
//       await supabase.from("contributions").insert({
//         amount: amount || 50000,
//         status: "pending",
//         group_id: groupId,
//         user_id: user.id,
//         transaction_ref: reference,
//       });
//     }

//     return NextResponse.json({ success: true, account: virtualAccount, reference });
//   } catch (error) {
//     console.error("Virtual account error:", error);
//     return NextResponse.json({ error: "Failed to create virtual account" }, { status: 500 });
//   }
// }





// import { NextRequest, NextResponse } from "next/server";
// import { createServerSupabase } from "@/lib/supabase/server";

// export async function POST(req: NextRequest) {
//   try {
//     const supabase = await createServerSupabase();
//     const { data: { user } } = await supabase.auth.getUser();
    
//     if (!user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { groupId, amount } = await req.json();
//     const reference = `SC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

//     const virtualAccount = {
//       bankName: "Wema Bank",
//       accountNumber: `803${Math.floor(1000000 + Math.random() * 9000000)}`,
//       accountName: `Kolo / ${user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}`,
//       reference,
//     };

//     // Create contribution
//     if (groupId) {
//       await supabase.from("contributions").insert({
//         amount: amount || 50000,
//         status: "pending",
//         group_id: groupId,
//         user_id: user.id,
//         transaction_ref: reference,
//       });
//     }

//     // Auto-confirm after a short delay (simulates payment)
//     setTimeout(async () => {
//       await supabase
//         .from("contributions")
//         .update({ status: "completed" })
//         .eq("transaction_ref", reference);

//       // Create transaction
//       await supabase.from("transactions").insert({
//         monnify_ref: reference,
//         amount: amount || 50000,
//         status: "completed",
//         type: "contribution",
//         group_id: groupId,
//         user_id: user.id,
//       });

//       // Update group pool
//       if (groupId) {
//         const { data: group } = await supabase
//           .from("groups")
//           .select("pool_amount")
//           .eq("id", groupId)
//           .single();
        
//         if (group) {
//           await supabase
//             .from("groups")
//             .update({ pool_amount: (group.pool_amount || 0) + (amount || 50000) })
//             .eq("id", groupId);
//         }
//       }
//     }, 8000);

//     return NextResponse.json({
//       success: true,
//       account: virtualAccount,
//       reference,
//     });
//   } catch (error) {
//     console.error("Virtual account error:", error);
//     return NextResponse.json({ error: "Failed to create virtual account" }, { status: 500 });
//   }
// }




// import { NextRequest, NextResponse } from "next/server";
// import { createServerSupabase } from "@/lib/supabase/server";

// export async function POST(req: NextRequest) {
//   try {
//     const supabase = await createServerSupabase();
//     const { data: { user } } = await supabase.auth.getUser();
    
//     if (!user) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { groupId, amount } = await req.json();

//     // Generate a unique reference
//     const reference = `SC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

//     // In production, this would call Monnify API to create a reserved account
//     // For hackathon demo, we simulate with realistic data
    
//     const virtualAccount = {
//       bankName: "Wema Bank",
//       accountNumber: `803${Math.floor(1000000 + Math.random() * 9000000)}`,
//       accountName: `Kolo / ${user.user_metadata?.full_name || user.email?.split("@")[0] || "User"}`,
//       reference,
//     };

//     // Create contribution record in database
//     if (groupId) {
//       const { error } = await supabase.from("contributions").insert({
//         amount: amount || 50000,
//         status: "pending",
//         group_id: groupId,
//         user_id: user.id,
//         transaction_ref: reference,
//       });

//       if (error) {
//         console.error("Failed to create contribution:", error);
//       }
//     }

//     return NextResponse.json({
//       success: true,
//       account: virtualAccount,
//       reference,
//     });
//   } catch (error) {
//     console.error("Virtual account error:", error);
//     return NextResponse.json({ error: "Failed to create virtual account" }, { status: 500 });
//   }
// }