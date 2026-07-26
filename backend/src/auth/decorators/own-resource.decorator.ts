import { SetMetadata } from '@nestjs/common';

export const OWN_RESOURCE_PARAM_KEY = 'ownResourceParam';

/**
 * Marks a route as merchant-owned: `OwnershipGuard` will compare the named
 * route param against the caller's `merchantId`, letting admins through
 * regardless. Example: `@OwnResource('merchantId') @Get(':merchantId')`.
 */
export const OwnResource = (paramName: string) => SetMetadata(OWN_RESOURCE_PARAM_KEY, paramName);
