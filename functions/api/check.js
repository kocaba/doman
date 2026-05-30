export async function onRequest(context) {
  const { request } = context;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const domain = url.searchParams.get("domain");

  if (!domain || !/^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]?\.[a-z]{2,}$/i.test(domain)) {
    return new Response(
      JSON.stringify({ error: "Invalid domain parameter" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const tld = domain.split(".").slice(1).join(".");
  const rdapBootstrapUrl = `https://data.iana.org/rdap/dns.json`;

  try {
    // Try common RDAP servers directly based on TLD
    const rdapServers = getRdapServer(tld);

    if (!rdapServers) {
      // Fallback: treat as unknown = possibly available, mark as unknown
      return new Response(
        JSON.stringify({ domain, available: null, status: "unknown" }),
        { headers: corsHeaders }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    let available = false;
    let checked = false;

    for (const server of rdapServers) {
      try {
        const rdapUrl = `${server}domain/${domain}`;
        const res = await fetch(rdapUrl, {
          signal: controller.signal,
          headers: { Accept: "application/rdap+json" },
        });

        clearTimeout(timeoutId);

        if (res.status === 404) {
          available = true;
        } else if (res.status === 200) {
          available = false;
        } else {
          // Rate limited or other error — mark as unknown
          return new Response(
            JSON.stringify({ domain, available: null, status: "unknown" }),
            { headers: corsHeaders }
          );
        }
        checked = true;
        break;
      } catch {
        continue;
      }
    }

    if (!checked) {
      return new Response(
        JSON.stringify({ domain, available: null, status: "unknown" }),
        { headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ domain, available, status: available ? "available" : "taken" }),
      { headers: corsHeaders }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ domain, available: null, status: "error", message: err.message }),
      { status: 200, headers: corsHeaders }
    );
  }
}

function getRdapServer(tld) {
  const servers = {
    com:  ["https://rdap.verisign.com/com/v1/"],
    net:  ["https://rdap.verisign.com/net/v1/"],
    org:  ["https://rdap.publicinterestregistry.org/rdap/"],
    io:   ["https://rdap.nic.io/"],
    co:   ["https://rdap.nic.co/"],
    ai:   ["https://rdap.nic.ai/"],
    app:  ["https://rdap.nic.google/"],
    dev:  ["https://rdap.nic.google/"],
    xyz:  ["https://rdap.nic.xyz/"],
    tech: ["https://rdap.centralnic.com/tech/"],
    shop: ["https://rdap.centralnic.com/shop/"],
    store:["https://rdap.centralnic.com/store/"],
    online:["https://rdap.centralnic.com/online/"],
    site: ["https://rdap.centralnic.com/site/"],
    cloud:["https://rdap.centralnic.com/cloud/"],
    biz:  ["https://rdap.nic.biz/"],
    info: ["https://rdap.afilias.net/rdap/info/"],
    us:   ["https://rdap.nic.us/"],
    uk:   ["https://rdap.nominet.uk/uk/"],
    de:   ["https://rdap.denic.de/"],
    fr:   ["https://rdap.nic.fr/"],
    nl:   ["https://rdap.sidn.nl/"],
    au:   ["https://rdap.auda.org.au/"],
    ca:   ["https://rdap.cira.ca/"],
    eu:   ["https://rdap.eu/"],
    pl:   ["https://rdap.dns.pl/"],
    media:["https://rdap.donuts.co/domain/"],
    agency:["https://rdap.donuts.co/domain/"],
    studio:["https://rdap.donuts.co/domain/"],
    design:["https://rdap.donuts.co/domain/"],
    digital:["https://rdap.centralnic.com/digital/"],
    solutions:["https://rdap.donuts.co/domain/"],
    network:["https://rdap.donuts.co/domain/"],
    systems:["https://rdap.donuts.co/domain/"],
    software:["https://rdap.donuts.co/domain/"],
    tools: ["https://rdap.donuts.co/domain/"],
    works: ["https://rdap.donuts.co/domain/"],
    space: ["https://rdap.centralnic.com/space/"],
  };

  return servers[tld.toLowerCase()] || ["https://rdap.org/domain/"];
}
