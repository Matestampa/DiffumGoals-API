const supertest=require("supertest");
const sharp=require("sharp");

const {App}=require("../../src/app.js");

const {DEFLT_API_ERRORS}=require("../../src/error_handling");

const {newGoal_Service}=require("../../src/services/newGoal/newGoalService.js");
const {validate_newGoal}=require("../../src/validators/goalsValidators.js");
jest.mock("../../src/services/newGoal/newGoalService.js");
jest.mock("../../src/validators/goalsValidators.js");

const api=supertest(App);

function prepareFields(agent, route, fields = {}, file = {}) {
    const req = agent.post(route);
  
    // Agregar campos al request
    Object.entries(fields).forEach(([key, value]) => {
      req.field(key, value);
    });
  
    // Agregar archivo si es necesario
    if (file.fieldName && file.buffer) {
      req.attach(file.fieldName, file.buffer, file.filename);
    }
  
    return req;
  }


describe('Integration test for POST /goals/new', () => {
    let testImageBuffer;
    
    //Crear imagen correcta
    beforeAll(async () => {
        testImageBuffer = await sharp({
          create: {
            width: 100,
            height: 100,
            channels: 3,
            background: { r: 255, g: 255, b: 255 } // color blanco
          }
        })
        .png()
        .toBuffer(); // Asegúrate de que esto es un Buffer
    });

    beforeEach(() => {
        jest.clearAllMocks();  // Clear mocks before each test
    });
    
    //Crear nuestro body correcto
    const mockGoal = {
        user_id: '5f50cae74f5d88a34a8b46ef',
        descr: 'Mi nuevo objetivo',
        limit_date: '2024-12-31',  // Fecha límite válida
    };

    it('should create a new goal and return 200 status', async () => {
        
        validate_newGoal.mockResolvedValueOnce(true);
        newGoal_Service.mockResolvedValueOnce({
          error:undefined,
          data:{goal_id:"sds",img_id:""}
        })
        
        const response = await prepareFields(api,"/goals/new",
              mockGoal,
              {fieldName:"img",
               buffer:testImageBuffer,
               filename:"Puto.png" 
              }   
        )

        // Validar la respuesta
        expect(response.status).toBe(200); // Espera un estado 201 (creado)
        expect(response.body.data).toHaveProperty('goal_id'); // Debe tener la propiedad db_id
        expect(response.body.data).toHaveProperty('img_id'); // Debe tener la propiedad s3_id
    });

    it ("should return 404 error for bad req data",async ()=>{
       validate_newGoal.mockResolvedValueOnce({
         error:DEFLT_API_ERRORS.BAD_REQ()
       })

       const response = await prepareFields(api,"/goals/new",
        mockGoal,
        {fieldName:"img",
         buffer:testImageBuffer,
         filename:"Puto.png" 
        })
        
         // Validar la respuesta
         expect(response.status).toBe(404); // Espera un estado 201 (creado)
         expect(response.error).toBeDefined();
    });

    it ("should return 500 error for service malfunc", async ()=>{
      
      validate_newGoal.mockResolvedValueOnce(true);
      newGoal_Service.mockResolvedValueOnce({error:DEFLT_API_ERRORS.SERVER(),data:undefined})

      const response = await prepareFields(api,"/goals/new",
        mockGoal,
        {fieldName:"img",
         buffer:testImageBuffer,
         filename:"Puto.png" 
        })
      
      expect(response.status).toBe(500);
      expect(response.error).toBeDefined();
    })

})