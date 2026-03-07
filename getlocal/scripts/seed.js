import { MongoClient } from 'mongodb';

const uri = 'mongodb://localhost:27017';
const dbName = 'getlocal';

async function seed() {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(dbName);
    
    // Clear existing data
    await db.collection('candidates').deleteMany({});
    await db.collection('jobs').deleteMany({});
    await db.collection('wallets').deleteMany({});
    
    // Seed candidates with varied locations around Delhi
    const candidates = [
      {
        _id: 'cand-001',
        name: 'Ramesh Kumar',
        phone: '9876543210',
        location: { lat: 28.6229, lng: 77.2080 }, // Near Connaught Place
        role_category: 'Driver',
        audio_interview_url: null,
        is_verified: true,
        created_at: new Date()
      },
      {
        _id: 'cand-002',
        name: 'Suresh Yadav',
        phone: '9876543211',
        location: { lat: 28.6519, lng: 77.2315 }, // Near Karol Bagh
        role_category: 'Delivery Boy',
        audio_interview_url: null,
        is_verified: false,
        created_at: new Date()
      },
      {
        _id: 'cand-003',
        name: 'Priya Sharma',
        phone: '9876543212',
        location: { lat: 28.5921, lng: 77.2290 }, // Near Sarojini Nagar
        role_category: 'Cook',
        audio_interview_url: null,
        is_verified: true,
        created_at: new Date()
      },
      {
        _id: 'cand-004',
        name: 'Vikram Singh',
        phone: '9876543213',
        location: { lat: 28.6353, lng: 77.2250 }, // Near Rajiv Chowk
        role_category: 'Security Guard',
        audio_interview_url: null,
        is_verified: false,
        created_at: new Date()
      },
      {
        _id: 'cand-005',
        name: 'Meena Devi',
        phone: '9876543214',
        location: { lat: 28.6100, lng: 77.2300 }, // Near Lodhi Road
        role_category: 'House Helper',
        audio_interview_url: null,
        is_verified: true,
        created_at: new Date()
      }
    ];
    
    await db.collection('candidates').insertMany(candidates);
    console.log(`Inserted ${candidates.length} candidates`);
    
    // Seed jobs
    const jobs = [
      {
        title: 'Full-time Driver Needed',
        business_name: 'Quick Deliveries Pvt Ltd',
        location: { city: 'Delhi', lat: 28.6139, lng: 77.2090 },
        status: 'Open',
        credits_required: 10,
        credits_used: 30,
        created_at: new Date()
      },
      {
        title: 'Night Security Guard',
        business_name: 'SafeGuard Services',
        location: { city: 'Gurgaon', lat: 28.4595, lng: 77.0266 },
        status: 'Open',
        credits_required: 10,
        credits_used: 20,
        created_at: new Date()
      },
      {
        title: 'Cook for Restaurant',
        business_name: 'Tasty Bites Restaurant',
        location: { city: 'Noida', lat: 28.5355, lng: 77.3910 },
        status: 'Closed',
        credits_required: 10,
        credits_used: 50,
        created_at: new Date()
      }
    ];
    
    await db.collection('jobs').insertMany(jobs);
    console.log(`Inserted ${jobs.length} jobs`);
    
    // Seed default wallet
    const wallet = {
      user_id: 'default-employer',
      credit_balance: 100,
      unlocked_candidates: [],
      created_at: new Date()
    };
    
    await db.collection('wallets').insertOne(wallet);
    console.log('Created default wallet with 100 credits');
    
    console.log('\\n✅ Database seeded successfully!');
    
  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await client.close();
  }
}

seed();
