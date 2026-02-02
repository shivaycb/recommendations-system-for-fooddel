import 'dotenv/config'
import neo4j from 'neo4j-driver'
import catalog from './src/data/catalog.json' with { type: 'json' }

// Load environment variables from .env file (dotenv handles this)
const NEO4J_URI = process.env.VITE_NEO4J_URI
const NEO4J_USERNAME = process.env.VITE_NEO4J_USERNAME
const NEO4J_PASSWORD = process.env.VITE_NEO4J_PASSWORD

async function intialize_db() {

    const driver = neo4j.driver(
        NEO4J_URI,
        neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
    )

    const distinctTags = [
        ...new Set(catalog.foods.flatMap(food => food.tags))
    ]

    var create_tag_contraints_cypher = `
    CREATE CONSTRAINT tag_name_unique
    IF NOT EXISTS
    FOR (t:Tag)
    REQUIRE t.name IS NODE KEY;
    `

    var create_restaurant_contraints_cypher = `
    CREATE CONSTRAINT restaurant_key
    IF NOT EXISTS
    FOR (r:Restaurant)
    REQUIRE r.id IS NODE KEY;
    `

    var create_food_contraints_cypher = `
    CREATE CONSTRAINT food_key
    IF NOT EXISTS
    FOR (f:Food)
    REQUIRE f.id IS NODE KEY;
    `

    var create_user_contraints_cypher = `
    CREATE CONSTRAINT user_key
    IF NOT EXISTS
    FOR (u:User)
    REQUIRE u.id IS NODE KEY;
    `

    var add_tags_cypher = `
    UNWIND $tags AS tag
    MERGE (t:Tag {name: toLower(tag)})
    `

    var add_restaurants_cypher = `
    UNWIND $allResData AS resData
    MERGE (r:Restaurant {id: resData.id})
    SET 
        r.name = resData.name,
        r.imageUrl = resData.imageUrl,
        r.tagline = resData.tagline,
        r.rating = resData.rating,
        r.deliveryFeeCents = resData.deliveryFeeCents,
        r.cuisines = resData.cuisines
    `

    var add_food_cypher = `
    UNWIND $allFoodData AS foodData
    MERGE (f:Food {id: foodData.id})
    SET 
        f.name = foodData.name,
        f.cuisine = foodData.cuisine,
        f.country = foodData.country,
        f.description = foodData.description,
        f.imageUrl = foodData.imageUrl,
        f.is_vegetarian = foodData.diet.vegetarian
    
    WITH f, foodData.tags AS tags
    UNWIND tags AS tagName
    MATCH (t:Tag {name: toLower(tagName)})
    MERGE (f)-[:HAS_TAG]->(t)
    `

    var add_restaurant_menus_cypher = `
    UNWIND $allMenus AS menu
    MATCH (r:Restaurant {id: menu.restaurantId})
    
    UNWIND menu.items AS item
    MATCH (f:Food {id: item.foodId})

    MERGE (r)-[menuInfo:HAS_FOOD]->(f)
    ON CREATE SET
        menuInfo.priceCents = item.priceCents,
        menuInfo.isAvailable = item.isAvailable,
        menuInfo.popular = item.popular
    `

    // Will link foods that exceed a similarity score of 40% which 
    // is calculated based on ratio of the tags they share / 
    // maximum total number of tags out of both foods.
    var link_similar_foods_cypher = `
    MATCH (f1:Food)-[:HAS_TAG]->(t:Tag)<-[:HAS_TAG]-(f2:Food)
    WHERE id(f1) < id(f2)
    WITH f1, f2,
        count(DISTINCT t) AS sharedTags,
        COUNT { (f1)-[:HAS_TAG]->() } AS tags1,
        COUNT { (f2)-[:HAS_TAG]->() } AS tags2
    WITH f1, f2,
        sharedTags * 1.0 / CASE
           WHEN tags1 > tags2 THEN tags1
           ELSE tags2
        END AS similarity
    WHERE similarity >= 0.40
    MERGE (f1)-[r:SIMILAR_TO]-(f2)
    SET r.score = similarity;
    `

    const session = driver.session()
    try {
        // Constraints & indexes (auto-commit)
        console.log(">>> Creating constraints...")
        await session.run(create_tag_contraints_cypher)
        await session.run(create_restaurant_contraints_cypher)
        await session.run(create_food_contraints_cypher)
        await session.run(create_user_contraints_cypher)

        console.log(">>> Constraints created successfully\n")

        // Data writes
        console.log(">>> Adding Tags...")
        await session.run(add_tags_cypher, { tags: distinctTags })
        console.log(">>> Adding Restaurants...")
        await session.run(add_restaurants_cypher, { allResData: catalog.restaurants })
        console.log(">>> Adding Foods...")
        await session.run(add_food_cypher, { allFoodData: catalog.foods })
        console.log(">>> Adding Restaurant Menus...")
        await session.run(add_restaurant_menus_cypher, { allMenus: catalog.menus })
        console.log(">>> Linking Similar Foods...")
        await session.run(link_similar_foods_cypher)
        console.log(">>> Data added successfully\n\n")
    } finally {
        await session.close()
        await driver.close()
    }
}

await intialize_db()