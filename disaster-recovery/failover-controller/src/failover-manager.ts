import AWS from 'aws-sdk';

export interface FailoverStatus {
  isInFailover: boolean;
  currentRegion: string;
  failoverTimestamp: Date | null;
  lastFailoverReason: string | null;
}

export class FailoverManager {
  private route53: AWS.Route53;
  private failoverState: FailoverStatus = {
    isInFailover: false,
    currentRegion: process.env.PRIMARY_REGION || 'us-east-1',
    failoverTimestamp: null,
    lastFailoverReason: null,
  };

  constructor() {
    this.route53 = new AWS.Route53({
      region: process.env.AWS_DEFAULT_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  async triggerFailover(reason: 'automatic' | 'manual'): Promise<void> {
    if (this.failoverState.isInFailover) {
      console.log('Already in failover state');
      return;
    }

    console.log(`Triggering ${reason} failover to DR region`);
    
    try {
      // Update DNS records
      await this.updateDNSRecords('dr');
      
      // Update failover state
      this.failoverState = {
        isInFailover: true,
        currentRegion: process.env.DR_REGION || 'eu-west-1',
        failoverTimestamp: new Date(),
        lastFailoverReason: reason,
      };
      
      console.log('Failover completed successfully');
    } catch (error) {
      console.error('Error during failover:', error);
      throw error;
    }
  }

  async triggerFailback(): Promise<void> {
    if (!this.failoverState.isInFailover) {
      console.log('Not in failover state');
      return;
    }

    console.log('Triggering failback to primary region');
    
    try {
      // Update DNS records
      await this.updateDNSRecords('primary');
      
      // Update failover state
      this.failoverState = {
        isInFailover: false,
        currentRegion: process.env.PRIMARY_REGION || 'us-east-1',
        failoverTimestamp: null,
        lastFailoverReason: null,
      };
      
      console.log('Failback completed successfully');
    } catch (error) {
      console.error('Error during failback:', error);
      throw error;
    }
  }

  private async updateDNSRecords(target: 'primary' | 'dr'): Promise<void> {
    const hostedZoneId = process.env.HOSTED_ZONE_ID;
    const primaryWeight = target === 'primary' ? 100 : 0;
    const drWeight = target === 'dr' ? 100 : 0;

    // Update primary record weight
    await this.route53.changeResourceRecordSets({
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Changes: [{
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: 'api.lumina.io',
            Type: 'A',
            SetIdentifier: 'primary-weighted',
            Weight: primaryWeight,
            AliasTarget: {
              HostedZoneId: process.env.PRIMARY_LB_ZONE_ID,
              DNSName: process.env.PRIMARY_LB_DNS,
              EvaluateTargetHealth: true,
            },
          },
        }],
      },
    }).promise();

    // Update DR record weight
    await this.route53.changeResourceRecordSets({
      HostedZoneId: hostedZoneId,
      ChangeBatch: {
        Changes: [{
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: 'api.lumina.io',
            Type: 'A',
            SetIdentifier: 'dr-weighted',
            Weight: drWeight,
            AliasTarget: {
              HostedZoneId: process.env.DR_LB_ZONE_ID,
              DNSName: process.env.DR_LB_DNS,
              EvaluateTargetHealth: true,
            },
          },
        }],
      },
    }).promise();
  }

  getStatus(): FailoverStatus {
    return { ...this.failoverState };
  }

  isInFailover(): boolean {
    return this.failoverState.isInFailover;
  }

  getFailoverTimestamp(): number {
    return this.failoverState.failoverTimestamp?.getTime() || 0;
  }

  getCurrentRegion(): string {
    return this.failoverState.currentRegion;
  }
}
