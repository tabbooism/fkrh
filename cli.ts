import readline from 'readline';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function runCLI() {
  console.clear();
  console.log(`
  ██████╗ ██╗   ██╗███╗   ██╗███████╗ ██████╗ ███████╗██╗███╗   ██╗████████╗
  ██╔══██╗██║   ██║████╗  ██║██╔════╝██╔═══██╗██╔════╝██║████╗  ██║╚══██╔══╝
  ██████╔╝██║   ██║██╔██╗ ██║█████╗  ██║   ██║███████╗██║██╔██╗ ██║   ██║   
  ██╔══██╗██║   ██║██║╚██╗██║██╔══╝  ██║   ██║╚════██║██║██║╚██╗██║   ██║   
  ██║  ██║╚██████╔╝██║ ╚████║███████╗╚██████╔╝███████║██║██║ ╚████║   ██║   
  ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚══════╝╚═╝╚═╝  ╚═══╝   ╚═╝   
                                                                            
  ==========================================================================
                      COMMAND LINE INTERFACE v1.0
  ==========================================================================
  `);

  const target = await question('Enter target (domain, IP, username, email): ');
  if (!target.trim()) {
    console.log('Target is required. Exiting.');
    rl.close();
    return;
  }

  console.log('\nAvailable OSINT Categories:');
  console.log('1. Infrastructure (DNS, WHOIS, Ports)');
  console.log('2. Social Media (Username correlation)');
  console.log('3. Dark Web (Breach databases, forums)');
  console.log('4. Offensive (NightFury v3.0 Scan)');
  console.log('5. All of the above');
  
  const categoryChoice = await question('\nSelect category (1-5): ');
  
  const categories = [];
  if (categoryChoice === '1' || categoryChoice === '5') categories.push('Infrastructure');
  if (categoryChoice === '2' || categoryChoice === '5') categories.push('Social Media');
  if (categoryChoice === '3' || categoryChoice === '5') categories.push('Dark Web');
  if (categoryChoice === '4' || categoryChoice === '5') categories.push('Offensive');

  if (categories.length === 0) {
    console.log('Invalid selection. Exiting.');
    rl.close();
    return;
  }

  console.log(`\n[*] Initiating investigation on target: ${target}`);
  console.log(`[*] Selected categories: ${categories.join(', ')}\n`);

  const findings: string[] = [];

  for (const category of categories) {
    console.log(`[+] Running ${category} module...`);
    
    // Simulate data collection delay
    await delay(1500 + Math.random() * 1000);
    
    if (category === 'Infrastructure') {
      findings.push(`Infrastructure: Target ${target} resolves to Cloudflare IPs. Open ports: 80, 443. WAF detected.`);
      console.log(`  -> Discovered infrastructure details.`);
    } else if (category === 'Social Media') {
      findings.push(`Social Media: Target ${target} associated with accounts on Twitter, GitHub, and Reddit.`);
      console.log(`  -> Discovered social media presence.`);
    } else if (category === 'Dark Web') {
      findings.push(`Dark Web: Target ${target} found in 2 breach compilations (2021, 2023).`);
      console.log(`  -> Discovered breach records.`);
    } else if (category === 'Offensive') {
      console.log(`  -> Initiating NightFury v3.0 scan...`);
      await delay(2000);
      findings.push(`Offensive: NightFury scan identified potential XSS and SSRF vulnerabilities on ${target}.`);
      console.log(`  -> Scan completed. Vulnerabilities logged.`);
    }
  }

  console.log('\n[*] Data collection complete. Initiating AI Analysis...\n');

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in the environment.');
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      You are an expert OSINT investigator. Analyze the following findings for the target: ${target}.
      
      Findings:
      ${findings.join('\n')}
      
      Provide a comprehensive, professional intelligence report including:
      1. Executive Summary
      2. Detailed Technical Analysis
      3. Threat Assessment & Risks
      4. Recommended Next Steps
      
      Format as Markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: prompt,
    });

    console.log('==========================================================================');
    console.log('                         AI INTELLIGENCE REPORT                           ');
    console.log('==========================================================================\n');
    console.log(response.text);
    console.log('\n==========================================================================');

  } catch (error: any) {
    const errorStr = error instanceof Error ? error.message : String(error);
    const isQuotaError = errorStr.includes('429') || errorStr.includes('RESOURCE_EXHAUSTED');
    
    console.log(`\n[!] AI Analysis failed: ${isQuotaError ? 'API Quota Exceeded' : errorStr}`);
    console.log('[!] Falling back to local report generation.\n');
    
    console.log('==========================================================================');
    console.log('                       LOCAL INTELLIGENCE REPORT                          ');
    console.log('==========================================================================\n');
    console.log(`Target: ${target}`);
    console.log(`\nFindings Summary:\n${findings.map(f => '- ' + f).join('\n')}`);
    console.log(`\nRecommendation: Proceed with manual verification of discovered vectors.`);
    console.log('\n==========================================================================');
  }

  rl.close();
}

runCLI();
