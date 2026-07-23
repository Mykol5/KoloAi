import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const body = await req.json();

    console.log("📨 Webhook received:", body);

    const { eventType, eventData, testMode } = body;

    // For test mode, allow manual payment confirmation
    if (testMode) {
      const { paymentReference, groupId, amount } = body;
      
      if (!paymentReference) {
        return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
      }

      // Update contribution to completed
      const { data: contribution } = await supabase
        .from("contributions")
        .update({ status: "completed" })
        .eq("transaction_ref", paymentReference)
        .select("*")
        .single();

      // Create transaction record
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("monnify_ref", paymentReference)
        .maybeSingle();

      if (!existingTx) {
        await supabase.from("transactions").insert({
          monnify_ref: paymentReference,
          amount: amount || contribution?.amount || 0,
          status: "completed",
          type: "contribution",
          group_id: groupId || contribution?.group_id,
          user_id: contribution?.user_id,
        });
      }

      // Update group pool
      if (contribution?.group_id) {
        const { data: group } = await supabase
          .from("groups")
          .select("pool_amount")
          .eq("id", contribution.group_id)
          .single();

        if (group) {
          await supabase
            .from("groups")
            .update({
              pool_amount: (group.pool_amount || 0) + (amount || contribution.amount || 0),
            })
            .eq("id", contribution.group_id);
        }
      }

      return NextResponse.json({
        success: true,
        message: "Test payment processed successfully! 🎉",
        contribution,
      });
    }

    // Real Monnify webhook handling
    if (
      eventType === "SUCCESSFUL_TRANSACTION" ||
      eventData?.paymentStatus === "PAID"
    ) {
      const paymentReference = eventData?.paymentReference || eventData?.transactionReference;
      const amountPaid = eventData?.amountPaid || eventData?.amount;

      if (!paymentReference) {
        return NextResponse.json({ error: "Missing payment reference" }, { status: 400 });
      }

      // Update contribution
      const { data: contribution } = await supabase
        .from("contributions")
        .update({ status: "completed" })
        .eq("transaction_ref", paymentReference)
        .select("*")
        .single();

      // Create transaction
      const { data: existingTx } = await supabase
        .from("transactions")
        .select("id")
        .eq("monnify_ref", paymentReference)
        .maybeSingle();

      if (!existingTx) {
        await supabase.from("transactions").insert({
          monnify_ref: paymentReference,
          amount: amountPaid || contribution?.amount || 0,
          status: "completed",
          type: "contribution",
          group_id: contribution?.group_id,
          user_id: contribution?.user_id,
        });
      }

      // Update group pool
      if (contribution?.group_id) {
        const { data: group } = await supabase
          .from("groups")
          .select("pool_amount")
          .eq("id", contribution.group_id)
          .single();

        if (group) {
          await supabase
            .from("groups")
            .update({
              pool_amount: (group.pool_amount || 0) + (amountPaid || contribution.amount || 0),
            })
            .eq("id", contribution.group_id);
        }
      }

      return NextResponse.json({ success: true, message: "Payment processed" });
    }

    return NextResponse.json({ success: true, message: "Event received" });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

// GET route for testing webhook URL
export async function GET() {
  return NextResponse.json({
    status: "active",
    message: "Monnify Webhook endpoint is running ✅",
    testEndpoint: "POST to this URL with { testMode: true, paymentReference: '...' } for testing",
  });
}
// 


// import { NextRequest, NextResponse } from "next/server";
// import { createServerSupabase } from "@/lib/supabase/server";

// export async function POST(req: NextRequest) {
//   try {
//     const supabase = await createServerSupabase();
//     const body = await req.json();

//     const { eventType, eventData } = body;

//     if (eventType === "SUCCESSFUL_TRANSACTION") {
//       const { paymentReference, amountPaid } = eventData;

//       // Update contribution status
//       await supabase
//         .from("contributions")
//         .update({ status: "completed" })
//         .eq("transaction_ref", paymentReference);

//       // Get contribution details
//       const { data: contribution } = await supabase
//         .from("contributions")
//         .select("*")
//         .eq("transaction_ref", paymentReference)
//         .single();

//       // Update group pool
//       if (contribution?.group_id) {
//         const { data: group } = await supabase
//           .from("groups")
//           .select("pool_amount")
//           .eq("id", contribution.group_id)
//           .single();

//         if (group) {
//           await supabase
//             .from("groups")
//             .update({ pool_amount: group.pool_amount + amountPaid })
//             .eq("id", contribution.group_id);
//         }
//       }

//       // Create transaction record
//       await supabase.from("transactions").insert({
//         monnify_ref: paymentReference,
//         amount: amountPaid,
//         status: "completed",
//         type: "contribution",
//         group_id: contribution?.group_id,
//         user_id: contribution?.user_id,
//       });
//     }

//     return NextResponse.json({ success: true });
//   } catch (error) {
//     console.error("Webhook error:", error);
//     return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
//   }
// }
