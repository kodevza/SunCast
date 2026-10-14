# PVGIS Gateway

The browser reaches PVGIS only through an Azure API Management Consumption endpoint.
The Node CLI deliberately continues to call PVGIS directly; it is not a browser
client and does not need CORS.

```text
https://kodevza.github.io/SunCast/
  -> Azure API Management Consumption
  -> https://re.jrc.ec.europa.eu/api/v5_3
```

## What is deployed

`infra/pvgis-apim/main.bicep` creates one API Management Consumption service,
an HTTPS-only API at `/api/v5_3`, two GET operations (`PVcalc` and
`seriescalc`), and an API policy for CORS and Origin checking.

- The API accepts HTTPS only and forwards to PVGIS over HTTPS.
- Only the two GET operations are exposed. The policy requires `Origin:
  https://kodevza.github.io`.
- CORS allows only `https://kodevza.github.io`; `Origin` does not include the
  `/SunCast/` path, so HTTP cannot distinguish that path from another page on
  the same GitHub Pages host.
- The API exposes only the two PVGIS operations used by SunCast, so the endpoint
  is not a general proxy. Caching is intentionally omitted because estimates
  are request-specific.

Consumption has no fixed profile charge and bills by API operation after its
included monthly allowance. It does **not** support `rate-limit-by-key`, so
the previous 120 requests/minute/client-IP WAF limit is not preserved. The
public endpoint can be called by non-browser clients with a forged Origin
header. Track requests and cost in Azure Monitor and Cost Management; add a
budget alert if unexpected usage matters. A budget alert notifies but does not
stop requests. APIM Consumption does not send Front Door-style health probes.

An Origin/CORS check protects browsers from another site reading the response;
it is not client authentication. A non-browser caller can forge `Origin`. Do
not expose secrets through this gateway. If the API becomes sensitive or costly,
put an authenticated backend in front of PVGIS instead.

## One-time setup

1. Pick a globally unique `serviceName` in
   `infra/pvgis-apim/main.bicepparam`.
2. Create the target resource group and configure GitHub OIDC as described in
   the runbook.
3. Add the `production` GitHub environment, restrict it to `main`, and require
   an approval if production changes need review.
4. Add the GitHub Actions configuration:
   - secrets: `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
   - repository variables: `AZURE_RESOURCE_GROUP`, `APIM_PUBLISHER_EMAIL`
5. Run **Deploy PVGIS gateway**. After it succeeds, **Deploy to GitHub Pages**
   runs automatically. Its build derives the public gateway URL from the
   `serviceName` in `main.bicepparam` and embeds it through
   `VITE_PVGIS_GATEWAY_URL`.

The browser client fails closed with a visible feature-level PVGIS error if
`VITE_PVGIS_GATEWAY_URL` is missing or malformed; it never falls back to direct
PVGIS calls.

## Deploy and verify

```bash
az bicep build --file infra/pvgis-apim/main.bicep
az deployment group what-if --resource-group <resource-group> \
  --template-file infra/pvgis-apim/main.bicep \
  --parameters infra/pvgis-apim/main.bicepparam publisherEmail=<publisher-email>
```

After the API deployment has propagated, use the deployed output URL:

```bash
gateway='https://<service>.azure-api.net/api/v5_3'
query='lat=52.229700&lon=21.012200&peakpower=1&loss=14&angle=35&aspect=0&fixed=1&outputformat=json'
curl -i -H 'Origin: https://kodevza.github.io' "$gateway/PVcalc?$query"
curl -i -H 'Origin: https://example.invalid' "$gateway/PVcalc?$query"
```

The first response must contain `Access-Control-Allow-Origin:
https://kodevza.github.io`; the second must be blocked with HTTP 403. Also
verify that `/api/v5_3/other` and POST are rejected. Confirm the browser
application’s PVGIS chart works after the Pages deployment.

## Rollback

To stop browser use immediately, disable the Pages deployment or revert the
gateway integration and deploy Pages. To revert gateway configuration, revert
the infrastructure commit and rerun the gateway workflow. The previous Front
Door profile, if already deployed, must be deleted separately after the APIM
gateway works; otherwise its fixed fee continues. The workflow does not delete
either gateway.
