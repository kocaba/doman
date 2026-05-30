export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/check") {
      return handleCheck(request);
    }

    // All other routes → serve static assets
    return env.ASSETS.fetch(request);
  },
};

async function handleCheck(request) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(request.url);
  const domain = url.searchParams.get("domain");

  if (!domain || !/^[a-z0-9][a-z0-9\-]{0,61}[a-z0-9]?\.[a-z]{2,}$/i.test(domain)) {
    return new Response(
      JSON.stringify({ error: "Invalid domain" }),
      { status: 400, headers: corsHeaders }
    );
  }

  const tld = domain.split(".").slice(1).join(".");
  const servers = getRdapServer(tld);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    for (const server of servers) {
      try {
        const res = await fetch(`${server}domain/${domain}`, {
          signal: controller.signal,
          headers: { Accept: "application/rdap+json" },
        });
        clearTimeout(timer);

        if (res.status === 404) {
          return json({ domain, available: true,  status: "available" }, corsHeaders);
        } else if (res.status === 200) {
          return json({ domain, available: false, status: "taken"     }, corsHeaders);
        } else {
          return json({ domain, available: null,  status: "unknown"   }, corsHeaders);
        }
      } catch {
        continue;
      }
    }

    return json({ domain, available: null, status: "unknown" }, corsHeaders);
  } catch {
    return json({ domain, available: null, status: "unknown" }, corsHeaders);
  }
}

function json(data, headers) {
  return new Response(JSON.stringify(data), { headers });
}

function getRdapServer(tld) {
  const map = {
    com:        ["https://rdap.verisign.com/com/v1/"],
    net:        ["https://rdap.verisign.com/net/v1/"],
    org:        ["https://rdap.publicinterestregistry.org/rdap/"],
    io:         ["https://rdap.nic.io/"],
    co:         ["https://rdap.nic.co/"],
    ai:         ["https://rdap.nic.ai/"],
    app:        ["https://rdap.nic.google/"],
    dev:        ["https://rdap.nic.google/"],
    xyz:        ["https://rdap.nic.xyz/"],
    tech:       ["https://rdap.centralnic.com/tech/"],
    shop:       ["https://rdap.centralnic.com/shop/"],
    store:      ["https://rdap.centralnic.com/store/"],
    online:     ["https://rdap.centralnic.com/online/"],
    site:       ["https://rdap.centralnic.com/site/"],
    cloud:      ["https://rdap.centralnic.com/cloud/"],
    space:      ["https://rdap.centralnic.com/space/"],
    digital:    ["https://rdap.centralnic.com/digital/"],
    biz:        ["https://rdap.nic.biz/"],
    us:         ["https://rdap.nic.us/"],
    de:         ["https://rdap.denic.de/"],
    fr:         ["https://rdap.nic.fr/"],
    nl:         ["https://rdap.sidn.nl/"],
    pl:         ["https://rdap.dns.pl/"],
    ca:         ["https://rdap.cira.ca/"],
    au:         ["https://rdap.auda.org.au/"],
    eu:         ["https://rdap.eu/"],
    media:      ["https://rdap.donuts.co/domain/"],
    agency:     ["https://rdap.donuts.co/domain/"],
    studio:     ["https://rdap.donuts.co/domain/"],
    design:     ["https://rdap.donuts.co/domain/"],
    solutions:  ["https://rdap.donuts.co/domain/"],
    network:    ["https://rdap.donuts.co/domain/"],
    systems:    ["https://rdap.donuts.co/domain/"],
    software:   ["https://rdap.donuts.co/domain/"],
    tools:      ["https://rdap.donuts.co/domain/"],
    works:      ["https://rdap.donuts.co/domain/"],
    marketing:  ["https://rdap.donuts.co/domain/"],
    email:      ["https://rdap.donuts.co/domain/"],
    events:     ["https://rdap.donuts.co/domain/"],
    press:      ["https://rdap.donuts.co/domain/"],
    social:     ["https://rdap.donuts.co/domain/"],
    sale:       ["https://rdap.donuts.co/domain/"],
    market:     ["https://rdap.donuts.co/domain/"],
    deals:      ["https://rdap.donuts.co/domain/"],
    fashion:    ["https://rdap.donuts.co/domain/"],
    boutique:   ["https://rdap.donuts.co/domain/"],
    cafe:       ["https://rdap.donuts.co/domain/"],
    bar:        ["https://rdap.donuts.co/domain/"],
    tours:      ["https://rdap.donuts.co/domain/"],
    academy:    ["https://rdap.donuts.co/domain/"],
    training:   ["https://rdap.donuts.co/domain/"],
  };
  return map[tld.toLowerCase()] || ["https://rdap.org/domain/"];
}
