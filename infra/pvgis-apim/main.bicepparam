using './main.bicep'

// Replace with a globally unique API Management service name before deployment.
param serviceName = 'suncast-pvgis-apim-prod'

// The deployment workflow overrides this placeholder from APIM_PUBLISHER_EMAIL.
param publisherEmail = 'replace-me@example.com'
