const request = require('supertest');
const {App}= require('../../src/app.js'); // Adjust the path to your app

const { connect_MongoDB, disconnect_MongoDB, GoalModel } = require('../../src/db/mongodb');
const crypto = require('crypto');

const {PAGE_LIMIT}=require("../../src/api/getGoals/const_vars.js");

const TESTED_ENDPOINT='/goals/all';

let response;

beforeAll(async () => {
    await connect_MongoDB();
    await GoalModel.deleteMany({}); // Clear the collection before tests

    // Insert between 10 and 20 test documents
    const numDocs = PAGE_LIMIT + 10;
    const testGoals = generateTestGoals(numDocs);
    await GoalModel.insertMany(testGoals);

    response = await request(App).get(`${TESTED_ENDPOINT}?page=1`);
});

describe('GET /goals', () => {
    it('should return a limited list of goals', async () => {
        //const response = await request(App).get(TESTED_ENDPOINT);
        expect(response.status).toBe(200);
        expect(response.body.data.goals).toBeInstanceOf(Array);
        expect(response.body.data.goals).toHaveLength(PAGE_LIMIT);
    });


    it('should return goals with the correct structure', async () => {
        //const response = await request(App).get(TESTED_ENDPOINT);
        expect(response.status).toBe(200);
        response.body.data.goals.forEach(goal => {
            expect(goal).toHaveProperty('_id');
            expect(goal).toHaveProperty('descr');
            expect(goal).toHaveProperty('limit_date');
            expect(goal).toHaveProperty('img_url');
            expect(goal).toHaveProperty('expired');
        });
    });

    it('should include nextPage in the response if there are more pages', async () => {
        //const response = await request(App).get(`${TESTED_ENDPOINT}?page=1`);
        expect(response.status).toBe(200);
        expect(response.body.data.nextPage).toBe(2);
    });

    it('should not include nextPage in the response if there are no more pages', async () => {
        const totalDocs = await GoalModel.countDocuments();
        const lastPage = Math.ceil(totalDocs / PAGE_LIMIT)+1;
        
        response = await request(App).get(`${TESTED_ENDPOINT}?page=${lastPage}`);
        
        expect(response.status).toBe(200);
        expect(response.body.data.nextPage).toBeNull();
    });

    //------------------------ TEST FOR FUTURE ---------------------------

    //it('should return goals correctly ordered by limit_date') 

});


afterAll(async () => {
    //await GoalModel.deleteMany({}); // Clear the collection after tests
    await disconnect_MongoDB();
});

const generateTestGoals = (num) => {
    const goals = [];
    for (let i = 1; i <= num; i++) {
        goals.push({
            user_id: crypto.randomBytes(12).toString("hex"),
            descr: `Test Goal ${i}`,
            limit_date: new Date(),
            s3_imgName: `test_image_${i}.png`,
            untouched_pix: [[0, 0], [1, 1]],
            cant_pix_xday: Math.floor(Math.random() * 20) + 1,
            diffum_color: [255, 255, 255],
            last_diffumDate: new Date()
        });
    }
    return goals;
};

