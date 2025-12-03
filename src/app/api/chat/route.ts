import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServiceSupabase } from '@/lib/supabase';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define tools available to the model
const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "search_database",
      description: `Search the Power Systems Inc. Supabase database for service reports, commissioning reports, customers, and engines.

      Use this function when users ask about:
      - Specific job orders (e.g., "What's the status of job order JO-2024-001?")
      - Customer information (e.g., "Show me records for ACME Corporation")
      - Engine details (e.g., "Find engines with serial number 12345")
      - Service history (e.g., "What service was done on this engine?")
      - Technician work (e.g., "What jobs did John Smith work on?")
      - Equipment specifications (e.g., "Show me Deutz engines at XYZ location")
      - Recommendations or findings from reports

      The search will look across all relevant fields in the database tables.`,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "The search keyword or phrase. Can be: job order number (JO-XXX), customer name, engine model, engine serial number, technician name, equipment type, location, or any identifier. Examples: 'JO-2024-001', 'ACME', 'Deutz 912', '12345', 'John Smith', 'Manila'",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_database_stats",
      description: `Get statistics and counts from the Power Systems Inc. database.

      Use this function when users ask about:
      - How many companies/customers/engines/reports are in the system
      - Total counts (e.g., "How many service reports?", "How many companies?")
      - Database overview or summary
      - General statistics

      This returns counts for all main tables: companies, customers, engines, service reports, and commissioning reports.`,
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

async function getDatabaseStats() {
  const supabase = getServiceSupabase();
  console.log('[CHATBOT] Fetching database statistics...');

  try {
    const stats: any = {
      timestamp: new Date().toISOString(),
    };

    // Get count of companies
    const { count: companiesCount, error: companiesError } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true });

    if (!companiesError) {
      stats.companies = companiesCount || 0;
    }

    // Get count of customers
    const { count: customersCount, error: customersError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });

    if (!customersError) {
      stats.customers = customersCount || 0;
    }

    // Get count of engines
    const { count: enginesCount, error: enginesError } = await supabase
      .from('engines')
      .select('*', { count: 'exact', head: true });

    if (!enginesError) {
      stats.engines = enginesCount || 0;
    }

    // Get count of service reports
    const { count: serviceCount, error: serviceError } = await supabase
      .from('deutz_service_report')
      .select('*', { count: 'exact', head: true });

    if (!serviceError) {
      stats.service_reports = serviceCount || 0;
    }

    // Get count of commissioning reports
    const { count: commCount, error: commError } = await supabase
      .from('deutz_commissioning_report')
      .select('*', { count: 'exact', head: true });

    if (!commError) {
      stats.commissioning_reports = commCount || 0;
    }

    console.log('[CHATBOT] Database statistics:', stats);
    return JSON.stringify({
      success: true,
      statistics: stats,
      message: `Database contains ${stats.companies} companies, ${stats.customers} customers, ${stats.engines} engines, ${stats.service_reports} service reports, and ${stats.commissioning_reports} commissioning reports.`
    });
  } catch (error) {
    console.error('[CHATBOT] Error fetching database statistics:', error);
    return JSON.stringify({ error: 'Failed to fetch database statistics' });
  }
}

async function searchDatabase(query: string) {
  const supabase = getServiceSupabase();
  const results: any[] = [];
  const searchPattern = `%${query.toLowerCase()}%`; // Case-insensitive search

  console.log(`[CHATBOT] Searching database for: "${query}"`);

  try {
    // Search Service Reports
    const { data: serviceReports, error: serviceError } = await supabase
      .from('deutz_service_report')
      .select('id, job_order, customer_name, engine_model, engine_serial_no, report_date, service_technician, findings, recommendations, action_taken, summary_details, address, email_address, equipment_manufacturer, equipment_model, equipment_serial_no, alternator_brand_model, alternator_serial_no, location, date_in_service, rating, revolution, starting_voltage, running_hours, fuel_pump_serial_no, fuel_pump_code, lube_oil_type, fuel_type, cooling_water_additives, date_failed, turbo_model, turbo_serial_no, customer_complaint, possible_cause, within_coverage_period, warrantable_failure, observation, contact_person')
      .or(`job_order.ilike.${searchPattern},customer_name.ilike.${searchPattern},engine_model.ilike.${searchPattern},engine_serial_no.ilike.${searchPattern},service_technician.ilike.${searchPattern},reporting_person_name.ilike.${searchPattern},equipment_model.ilike.${searchPattern},equipment_manufacturer.ilike.${searchPattern},location.ilike.${searchPattern},contact_person.ilike.${searchPattern}`)
      .order('report_date', { ascending: false })
      .limit(5);

    if (serviceError) {
      console.error("[CHATBOT] Error searching service reports:", serviceError);
    } else if (serviceReports && serviceReports.length > 0) {
      console.log(`[CHATBOT] Found ${serviceReports.length} service reports`);
      results.push(...serviceReports.map(r => ({
        type: 'Service Report',
        id: r.id,
        job_order: r.job_order,
        customer: r.customer_name,
        engine_model: r.engine_model,
        engine_serial: r.engine_serial_no,
        date: r.report_date,
        technician: r.service_technician,
        complaint: r.customer_complaint,
        findings: r.findings,
        action_taken: r.action_taken,
        recommendations: r.recommendations,
        summary: r.summary_details,
        observation: r.observation,
        location: r.location,
        equipment: `${r.equipment_manufacturer} ${r.equipment_model}`.trim(),
        warranty_info: r.within_coverage_period ? 'Within coverage' : 'Out of coverage',
        warrantable: r.warrantable_failure ? 'Yes' : 'No'
      })));
    }

    // Search Commissioning Reports
    const { data: commReports, error: commError } = await supabase
      .from('deutz_commissioning_report')
      .select('id, job_order_no, customer_name, engine_model, engine_serial_no, commissioning_date, attending_technician, summary, remarks, recommendation, equipment_name, running_hours, address, email_address, commissioning_location, equipment_manufacturer, equipment_no, equipment_type, output, revolutions, main_effective_pressure, lube_oil_type, fuel_type, cooling_water_additives, fuel_pump_serial_no, fuel_pump_code, turbo_model, turbo_serial_no, inspector, comments_action, contact_person')
      .or(`job_order_no.ilike.${searchPattern},customer_name.ilike.${searchPattern},engine_model.ilike.${searchPattern},engine_serial_no.ilike.${searchPattern},attending_technician.ilike.${searchPattern},reporting_person_name.ilike.${searchPattern},equipment_name.ilike.${searchPattern},commissioning_location.ilike.${searchPattern},equipment_manufacturer.ilike.${searchPattern},contact_person.ilike.${searchPattern}`)
      .order('commissioning_date', { ascending: false })
      .limit(5);

    if (commError) {
      console.error("[CHATBOT] Error searching commissioning reports:", commError);
    } else if (commReports && commReports.length > 0) {
      console.log(`[CHATBOT] Found ${commReports.length} commissioning reports`);
      results.push(...commReports.map(r => ({
        type: 'Commissioning Report',
        id: r.id,
        job_order: r.job_order_no,
        customer: r.customer_name,
        engine_model: r.engine_model,
        engine_serial: r.engine_serial_no,
        date: r.commissioning_date,
        technician: r.attending_technician,
        location: r.commissioning_location,
        equipment: r.equipment_name,
        summary: r.summary,
        remarks: r.remarks,
        recommendations: r.recommendation,
        running_hours: r.running_hours,
        fuel_type: r.fuel_type,
        lube_oil: r.lube_oil_type
      })));
    }

    // Search Customers
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, name, customer, contactperson, address, email, equipment')
      .or(`name.ilike.${searchPattern},customer.ilike.${searchPattern},contactperson.ilike.${searchPattern},address.ilike.${searchPattern},email.ilike.${searchPattern},equipment.ilike.${searchPattern}`)
      .limit(5);

    if (customerError) {
      console.error("[CHATBOT] Error searching customers:", customerError);
    } else if (customers && customers.length > 0) {
      console.log(`[CHATBOT] Found ${customers.length} customers`);
      results.push(...customers.map(c => ({
        type: 'Customer',
        id: c.id,
        name: c.name,
        customer: c.customer,
        contact_person: c.contactperson,
        address: c.address,
        email: c.email,
        equipment: c.equipment
      })));
    }

    // Search Engines
    const { data: engines, error: engineError } = await supabase
      .from('engines')
      .select('id, model, serialno, altbrandmodel, equipmodel, equipserialno, altserialno, location, rating, rpm, startvoltage, runhours, fuelpumpsn, fuelpumpcode, lubeoil, fueltype, coolantadditive, turbomodel, turbosn, companyid')
      .or(`model.ilike.${searchPattern},serialno.ilike.${searchPattern},equipmodel.ilike.${searchPattern},equipserialno.ilike.${searchPattern},turbomodel.ilike.${searchPattern},location.ilike.${searchPattern},lubeoil.ilike.${searchPattern},fueltype.ilike.${searchPattern}`)
      .limit(5);

    if (engineError) {
      console.error("[CHATBOT] Error searching engines:", engineError);
    } else if (engines && engines.length > 0) {
      console.log(`[CHATBOT] Found ${engines.length} engines`);
      results.push(...engines.map(e => ({
        type: 'Engine',
        id: e.id,
        model: e.model,
        serial_number: e.serialno,
        alternator: e.altbrandmodel,
        equipment: `${e.equipmodel} (${e.equipserialno})`.trim(),
        location: e.location,
        rating: e.rating,
        rpm: e.rpm,
        running_hours: e.runhours,
        fuel_type: e.fueltype,
        lube_oil: e.lubeoil,
        turbo: `${e.turbomodel} (${e.turbosn})`.trim()
      })));
    }

    console.log(`[CHATBOT] Total results found: ${results.length}`);

    if (results.length === 0) {
      return JSON.stringify({ message: "No records found matching your query." });
    }

    return JSON.stringify(results);
  } catch (error) {
    console.error("[CHATBOT] Database search error:", error);
    return JSON.stringify({ error: "An error occurred while searching the database." });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, messages } = body;

    console.log('[CHATBOT] Received request:', {
      hasQuestion: !!question,
      messageCount: messages?.length || 0
    });

    if (!process.env.OPENAI_API_KEY) {
      console.error('[CHATBOT] OpenAI API key not configured');
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Construct messages array
    let chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    
    const systemMessage: OpenAI.Chat.Completions.ChatCompletionSystemMessageParam = {
      role: "system",
      content: `You are a specialized assistant for Power Systems Inc., a company that provides service and commissioning for Deutz engines and power generation equipment.

      Your primary role is to answer questions based ONLY on the data found in the database via the available tools.

      DATABASE SCHEMA:
      - Service Reports: Contains job orders, customer complaints, findings, recommendations, action taken, engine details (model, serial no), equipment info, technician names, dates, and warranty information
      - Commissioning Reports: Contains job orders, commissioning details, engine setup information, performance checks, cylinder readings, part numbers, and inspector notes
      - Customers: Contains customer names, contact persons, addresses, emails, and equipment information
      - Engines: Contains engine models, serial numbers, alternator details, equipment details, location, ratings, RPM, fuel pump info, turbo details, and lubricant types

      SEARCH STRATEGY:
      - For job-related questions: Search by job order number, customer name, or technician name
      - For engine-related questions: Search by engine model, engine serial number, or equipment details
      - For customer questions: Search by customer name, contact person, or location
      - For technical questions: Search by equipment type, model, or specific part numbers

      RESPONSE GUIDELINES:
      1. ALWAYS use the 'search_database' tool when users ask about:
         - Specific job orders, reports, or service records
         - Customer information or equipment
         - Engine specifications or history
         - Technician work or recommendations
         - Any specific data point (serial numbers, models, dates, etc.)

      2. When presenting search results:
         - Provide clear, organized information
         - Include relevant identifiers (Job Order #, Engine Serial #, Date)
         - Summarize key findings or recommendations
         - Mention the technician or inspector when relevant

      3. If no data is found:
         - Politely inform the user that no matching records were found
         - Suggest alternative search terms if appropriate
         - Never make up or assume information

      4. Keep responses professional, accurate, and concise.
      5. If asked general questions about Power Systems Inc. services, provide helpful information but always offer to search for specific records if needed.`
    };

    if (messages && Array.isArray(messages) && messages.length > 0) {
      // Filter out the initial assistant greeting to avoid confusion
      const conversationMessages = messages.filter(m =>
        !(m.role === 'assistant' && m.content.includes("Power Systems Inc. assistant"))
      );
      chatMessages = [systemMessage, ...conversationMessages];
      console.log(`[CHATBOT] Using ${conversationMessages.length} conversation messages`);
    } else if (question) {
      chatMessages = [
        systemMessage,
        { role: "user", content: question }
      ];
      console.log('[CHATBOT] Using single question mode');
    } else {
      console.error('[CHATBOT] Missing question or messages in request body');
      return NextResponse.json(
        { error: 'Missing question or messages in request body' },
        { status: 400 }
      );
    }

    // First call to OpenAI to decide if a tool is needed
    console.log('[CHATBOT] Making initial OpenAI request...');
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: chatMessages,
      tools: tools,
      tool_choice: "auto",
      temperature: 0.7,
    });

    const responseMessage = completion.choices[0].message;

    // Check if the model wanted to call a function
    if (responseMessage.tool_calls) {
      console.log(`[CHATBOT] Model requested ${responseMessage.tool_calls.length} tool call(s)`);
      // Add the model's response (which includes the tool call) to the conversation history
      chatMessages.push(responseMessage);

      for (const toolCall of responseMessage.tool_calls) {
        // Type assertion to access function property
        const functionCall = (toolCall as any).function;
        if (!functionCall) continue;

        if (functionCall.name === "search_database") {
          const args = JSON.parse(functionCall.arguments);
          console.log(`[CHATBOT] Tool called with query: "${args.query}"`);

          // Execute the search
          const searchResult = await searchDatabase(args.query);

          // Add the tool's output to the conversation history
          chatMessages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: searchResult,
          });
        } else if (functionCall.name === "get_database_stats") {
          console.log('[CHATBOT] Getting database statistics');

          // Execute the stats query
          const statsResult = await getDatabaseStats();

          // Add the tool's output to the conversation history
          chatMessages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            content: statsResult,
          });
        }
      }

      // Second call to OpenAI to generate the final answer based on the tool output
      console.log('[CHATBOT] Making second OpenAI request with tool results...');
      const secondCompletion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: chatMessages,
        temperature: 0.7,
      });

      const finalAnswer = secondCompletion.choices[0].message.content;
      console.log('[CHATBOT] Successfully generated response with tool data');
      return NextResponse.json({ answer: finalAnswer });
    }

    // If no tool was called, return the direct response
    console.log('[CHATBOT] No tool call needed, returning direct response');
    return NextResponse.json({ answer: responseMessage.content });

  } catch (error: any) {
    console.error('[CHATBOT] Error processing request:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // Provide more specific error messages
    let errorMessage = 'Failed to process request';
    if (error.message?.includes('API key')) {
      errorMessage = 'OpenAI API key is invalid or missing';
    } else if (error.message?.includes('rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again in a moment';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. Please try again';
    }

    return NextResponse.json(
      { error: errorMessage, details: error.message },
      { status: 500 }
    );
  }
}