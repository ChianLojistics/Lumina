import { Injectable, NestMiddleware, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../tenant.service';
import { Tenant } from '../entities/tenant.entity';

declare global {
  namespace Express {
    interface Request {
      tenant?: Tenant;
      tenantId?: string;
    }
  }
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tenantService: TenantService) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenant = await this.identifyTenant(req);
    
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.is_active || tenant.status === 'suspended') {
      throw new UnauthorizedException('Tenant is not active');
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;

    // Set PostgreSQL session variable for RLS (will be implemented in database)
    // This requires the DataSource to be injected, which we'll add later
    // await this.dataSource.query(`SET app.current_tenant_id = '${tenant.id}'`);

    next();
  }

  private async identifyTenant(req: Request): Promise<Tenant | null> {
    // Try subdomain first (e.g., tenant.example.com)
    const host = req.hostname;
    if (host && host.includes('.')) {
      const subdomain = host.split('.')[0];
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        const tenant = await this.tenantService.findBySlug(subdomain);
        if (tenant) return tenant;
      }
    }

    // Try custom domain
    if (host) {
      const tenant = await this.tenantService.findByDomain(host);
      if (tenant) return tenant;
    }

    // Try header (x-tenant-id or x-tenant-slug)
    const tenantIdHeader = req.headers['x-tenant-id'] as string;
    if (tenantIdHeader) {
      try {
        const tenant = await this.tenantService.findOne(tenantIdHeader);
        return tenant;
      } catch (e) {
        // Invalid ID, continue to other methods
      }
    }

    const tenantSlugHeader = req.headers['x-tenant-slug'] as string;
    if (tenantSlugHeader) {
      const tenant = await this.tenantService.findBySlug(tenantSlugHeader);
      if (tenant) return tenant;
    }

    // Try path parameter (for API routes)
    if (req.params.tenantId) {
      try {
        const tenant = await this.tenantService.findOne(req.params.tenantId);
        return tenant;
      } catch (e) {
        // Invalid ID
      }
    }

    // Try query parameter (for testing)
    if (req.query.tenantId) {
      try {
        const tenant = await this.tenantService.findOne(req.query.tenantId as string);
        return tenant;
      } catch (e) {
        // Invalid ID
      }
    }

    if (req.query.tenantSlug) {
      const tenant = await this.tenantService.findBySlug(req.query.tenantSlug as string);
      if (tenant) return tenant;
    }

    // No tenant found - this could be valid for public endpoints
    // The controller/guard will handle authorization
    return null;
  }
}
