import { Gateway, Wallets, Network, Contract } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';
import FabricCAServices from 'fabric-ca-client';
import { logger } from './logger';

export class FabricConnection {
  private gateway: Gateway | null = null;
  private network: Network | null = null;
  private contract: Contract | null = null;

  async connect(): Promise<Contract> {
    try {
      // Load connection profile from fabric-samples test-network
      const ccpPath = path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'scripts',
        'fabric-samples',
        'test-network',
        'organizations',
        'peerOrganizations',
        'org1.example.com',
        'connection-org1.json'
      );

      if (!fs.existsSync(ccpPath)) {
        throw new Error(`Connection profile not found at ${ccpPath}`);
      }

      const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
      const ccp = JSON.parse(ccpJSON);

      // Create wallet
      const walletPath = path.join(__dirname, '..', '..', 'wallet');
      const wallet = await Wallets.newFileSystemWallet(walletPath);

      // Always check and re-enroll to ensure fresh identity with current network
      logger.info('Checking user identity...');
      let identity = await wallet.get('appUser');
      
      // If identity doesn't exist or enrollment fails, enroll fresh
      if (!identity) {
        logger.info('User identity not found, enrolling...');
        await this.enrollUser(ccp, wallet);
        identity = await wallet.get('appUser');
      }
      
      if (!identity) {
        throw new Error('Failed to enroll user');
      }

      // Create gateway
      this.gateway = new Gateway();
      await this.gateway.connect(ccp, {
        wallet,
        identity: 'appUser',
        discovery: { enabled: true, asLocalhost: true },
      });

      logger.info('Connected to Fabric Gateway');

      // Get network and contract
      this.network = await this.gateway.getNetwork(process.env.CHANNEL_NAME || 'mychannel');
      this.contract = this.network.getContract(process.env.CHAINCODE_NAME || 'parking');

      logger.info('Contract obtained successfully');

      return this.contract;
    } catch (error) {
      logger.error('Failed to connect to Fabric network:', error);
      throw error;
    }
  }

  private async enrollUser(ccp: any, wallet: any): Promise<void> {
    try {
      // Create CA client
      const caInfo = ccp.certificateAuthorities['ca.org1.example.com'];
      const caTLSCACerts = caInfo.tlsCACerts.pem;
      const ca = new FabricCAServices(
        caInfo.url,
        { trustedRoots: caTLSCACerts, verify: false },
        caInfo.caName
      );

      // Check admin identity
      const adminIdentity = await wallet.get('admin');
      if (!adminIdentity) {
        // Enroll admin
        const enrollment = await ca.enroll({
          enrollmentID: 'admin',
          enrollmentSecret: 'adminpw',
        });

        const x509Identity = {
          credentials: {
            certificate: enrollment.certificate,
            privateKey: enrollment.key.toBytes(),
          },
          mspId: 'Org1MSP',
          type: 'X.509',
        };

        await wallet.put('admin', x509Identity);
        logger.info('Admin enrolled successfully');
      }

      // Get admin identity
      const adminUser = await wallet.get('admin');

      // Register and enroll app user
      const provider = wallet.getProviderRegistry().getProvider(adminUser.type);
      const adminUserContext = await provider.getUserContext(adminUser, 'admin');

      let secret: string;
      let isNewRegistration = true;

      try {
        // Try to register the user
        secret = await ca.register(
          {
            affiliation: 'org1.department1',
            enrollmentID: 'appUser',
            role: 'client',
          },
          adminUserContext
        );
        logger.info('appUser registered successfully');
      } catch (error: any) {
        // If user is already registered, try to revoke and re-register
        if (error.message && error.message.includes('already registered')) {
          logger.info('appUser already registered, attempting to revoke and re-register');
          isNewRegistration = false;
          
          try {
            // Try to revoke existing registration
            await ca.revoke({ enrollmentID: 'appUser' }, adminUserContext);
            logger.info('appUser revoked successfully');
            
            // Now register with a new secret
            secret = await ca.register(
              {
                affiliation: 'org1.department1',
                enrollmentID: 'appUser',
                role: 'client',
              },
              adminUserContext
            );
            logger.info('appUser re-registered successfully');
            isNewRegistration = true;
          } catch (revokeError: any) {
            logger.warn('Could not revoke appUser', revokeError);
            // If revoke fails, we cannot proceed - the user is locked in CA
            throw new Error('appUser is already registered in Fabric CA and cannot be modified. Please restart the Fabric network or manually remove the user from Fabric CA.');
          }
        } else {
          throw error;
        }
      }

      const enrollment = await ca.enroll({
        enrollmentID: 'appUser',
        enrollmentSecret: secret,
      });

      const x509Identity = {
        credentials: {
          certificate: enrollment.certificate,
          privateKey: enrollment.key.toBytes(),
        },
        mspId: 'Org1MSP',
        type: 'X.509',
      };

      await wallet.put('appUser', x509Identity);
      logger.info('App user enrolled successfully');
    } catch (error) {
      logger.error('Failed to enroll user:', error);
      throw error;
    }
  }

  getContract(): Contract {
    if (!this.contract) {
      throw new Error('Contract not initialized. Call connect() first.');
    }
    return this.contract;
  }

  getNetwork(): Network {
    if (!this.network) {
      throw new Error('Network not initialized. Call connect() first.');
    }
    return this.network;
  }

  async disconnect(): Promise<void> {
    if (this.gateway) {
      this.gateway.disconnect();
      logger.info('Disconnected from Fabric Gateway');
    }
  }
}

export const fabricConnection = new FabricConnection();
