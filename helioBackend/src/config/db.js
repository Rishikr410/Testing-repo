import mongoose from "mongoose"
import { seedDemoMedicines } from "../utils/medicineSeed.js";

const connectDataBase = async () => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}`)
        console.log("Database connected")
        await seedDemoMedicines()
        console.log("Demo medicine catalog is ready")
    }
    catch(error){
        console.log("Error in database connection in db.js function connectDataBase", error.message)
        process.exit(1)
    }
}

export default connectDataBase;