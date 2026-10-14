@description('Globally unique Azure API Management service name.')
param serviceName string

@description('Publisher email required by Azure API Management.')
param publisherEmail string

@description('Azure region for the Consumption gateway.')
param location string = resourceGroup().location

@description('The browser Origin header allowed to use the public gateway. It does not include a path.')
param allowedOrigin string = 'https://kodevza.github.io'

resource service 'Microsoft.ApiManagement/service@2024-05-01' = {
  name: serviceName
  location: location
  sku: {
    name: 'Consumption'
    capacity: 0
  }
  properties: {
    publisherName: 'SunCast'
    publisherEmail: publisherEmail
  }
}

resource pvgisApi 'Microsoft.ApiManagement/service/apis@2024-05-01' = {
  parent: service
  name: 'pvgis-v5-3'
  properties: {
    displayName: 'PVGIS v5.3'
    path: 'api/v5_3'
    protocols: [
      'https'
    ]
    serviceUrl: 'https://re.jrc.ec.europa.eu/api/v5_3'
    subscriptionRequired: false
    type: 'http'
  }
}

resource pvcalc 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = {
  parent: pvgisApi
  name: 'pvcalc-get'
  properties: {
    displayName: 'PVcalc'
    method: 'GET'
    urlTemplate: '/PVcalc'
  }
}

resource seriescalc 'Microsoft.ApiManagement/service/apis/operations@2024-05-01' = {
  parent: pvgisApi
  name: 'seriescalc-get'
  properties: {
    displayName: 'seriescalc'
    method: 'GET'
    urlTemplate: '/seriescalc'
  }
}

resource pvgisPolicy 'Microsoft.ApiManagement/service/apis/policies@2024-05-01' = {
  parent: pvgisApi
  name: 'policy'
  properties: {
    format: 'rawxml'
    value: replace(loadTextContent('./policy.xml'), '__ALLOWED_ORIGIN__', allowedOrigin)
  }
}

output gatewayBaseUrl string = 'https://${serviceName}.azure-api.net'
output pvgisGatewayUrl string = 'https://${serviceName}.azure-api.net/api/v5_3'
output allowedBrowserOrigin string = allowedOrigin
