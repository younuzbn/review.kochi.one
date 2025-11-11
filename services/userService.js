const { admin } = require('../config/firebase');

class UserService {
    constructor() {
        this.db = admin.firestore();
        this.usersCollection = this.db.collection('users');
    }

    // Generate business number with BIS prefix
    async generateBusinessNumber() {
        try {
            const snapshot = await this.usersCollection
                .orderBy('businessNumber', 'desc')
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                return 'BIS00001';
            }
            
            const lastUser = snapshot.docs[0].data();
            const lastNumber = parseInt(lastUser.businessNumber.replace('BIS', ''));
            const nextNumber = (lastNumber + 1).toString().padStart(5, '0');
            
            return `BIS${nextNumber}`;
        } catch (error) {
            console.error('Error generating business number:', error);
            return 'BIS00001';
        }
    }

    // Create a new user
    async createUser(userData) {
        try {
            const businessNumber = await this.generateBusinessNumber();
            
            const user = {
                ...userData,
                businessNumber,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            };

            const docRef = await this.usersCollection.add(user);
            return { id: docRef.id, ...user };
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    // Get all users
    async getAllUsers() {
        try {
            const snapshot = await this.usersCollection
                .orderBy('createdAt', 'desc')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting users:', error);
            throw error;
        }
    }

    // Get user by ID
    async getUserById(userId) {
        try {
            const doc = await this.usersCollection.doc(userId).get();
            
            if (!doc.exists) {
                return null;
            }
            
            return { id: doc.id, ...doc.data() };
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    // Update user
    async updateUser(userId, userData) {
        try {
            const updateData = {
                ...userData,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            await this.usersCollection.doc(userId).update(updateData);
            return { id: userId, ...updateData };
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    // Delete user
    async deleteUser(userId) {
        try {
            console.log('Attempting to delete user from Firestore with ID:', userId);
            
            // Check if document exists first
            const docRef = this.usersCollection.doc(userId);
            const doc = await docRef.get();
            
            if (!doc.exists) {
                console.log('Document does not exist for user ID:', userId);
                throw new Error('User not found');
            }
            
            console.log('Document exists, proceeding with deletion...');
            await docRef.delete();
            console.log('User successfully deleted from Firestore');
            return true;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    // Search users
    async searchUsers(query) {
        try {
            const snapshot = await this.usersCollection
                .where('email', '>=', query)
                .where('email', '<=', query + '\uf8ff')
                .get();
            
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error searching users:', error);
            throw error;
        }
    }

    // Get user by business number (public API)
    async getUserByBusinessNumber(businessNumber) {
        try {
            const snapshot = await this.usersCollection
                .where('businessNumber', '==', businessNumber)
                .where('status', '==', 'active')
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                return null;
            }
            
            const doc = snapshot.docs[0];
            const userData = doc.data();
            
            // Return public data only (exclude sensitive information)
            return {
                id: doc.id,
                name: userData.name,
                email: userData.email,
                mobileNumber: userData.mobileNumber,
                businessNumber: userData.businessNumber,
                bannerImage: userData.bannerImage,
                logo: userData.logo,
                reviewUrl: userData.reviewUrl,
                minimumRating: userData.minimumRating || 0,
                buttons: userData.buttons || [],
                socialLinks: userData.socialLinks || [],
                menuPdf: userData.menuPdf || null,
                createdAt: userData.createdAt,
                status: userData.status
            };
        } catch (error) {
            console.error('Error getting user by business number:', error);
            throw error;
        }
    }

    // Get user by email (for user dashboard)
    async getUserByEmail(email) {
        try {
            const snapshot = await this.usersCollection
                .where('email', '==', email)
                .where('status', '==', 'active')
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                return null;
            }
            
            const doc = snapshot.docs[0];
            const userData = doc.data();
            
            // Return full user data for dashboard
            return {
                id: doc.id,
                name: userData.name,
                email: userData.email,
                mobileNumber: userData.mobileNumber,
                businessNumber: userData.businessNumber,
                bannerImage: userData.bannerImage,
                logo: userData.logo,
                reviewUrl: userData.reviewUrl,
                menuPdf: userData.menuPdf || null,
                buttons: userData.buttons || [],
                socialLinks: userData.socialLinks || [],
                analytics: userData.analytics || {
                    totalVisits: 0,
                    visitsByDate: {},
                    lastVisit: null,
                    reviews: {
                        totalSubmissions: 0,
                        submissionsByDate: {},
                        averageRating: 0,
                        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                    }
                },
                createdAt: userData.createdAt,
                updatedAt: userData.updatedAt,
                status: userData.status
            };
        } catch (error) {
            console.error('Error getting user by email:', error);
            throw error;
        }
    }

    // Track review page visit
    async trackReviewPageVisit(businessNumber) {
        try {
            const snapshot = await this.usersCollection
                .where('businessNumber', '==', businessNumber)
                .where('status', '==', 'active')
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                console.log('User not found for business number:', businessNumber);
                return;
            }
            
            const doc = snapshot.docs[0];
            const userData = doc.data();
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // Initialize analytics data if it doesn't exist
            const analytics = userData.analytics || {
                totalVisits: 0,
                visitsByDate: {},
                lastVisit: null,
                reviews: {
                    totalSubmissions: 0,
                    submissionsByDate: {},
                    averageRating: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                }
            };
            
            // Update analytics
            analytics.totalVisits = (analytics.totalVisits || 0) + 1;
            analytics.visitsByDate[today] = (analytics.visitsByDate[today] || 0) + 1;
            analytics.lastVisit = admin.firestore.FieldValue.serverTimestamp();
            
            // Update the user document
            await doc.ref.update({
                analytics: analytics,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`Visit tracked for ${businessNumber}. Total visits: ${analytics.totalVisits}`);
        } catch (error) {
            console.error('Error tracking review page visit:', error);
            throw error;
        }
    }

    // Track review submission
    async trackReviewSubmission(businessNumber, reviewData) {
        try {
            const snapshot = await this.usersCollection
                .where('businessNumber', '==', businessNumber)
                .where('status', '==', 'active')
                .limit(1)
                .get();
            
            if (snapshot.empty) {
                console.log('User not found for business number:', businessNumber);
                return;
            }
            
            const doc = snapshot.docs[0];
            const userData = doc.data();
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            
            // Initialize analytics data if it doesn't exist
            const analytics = userData.analytics || {
                totalVisits: 0,
                visitsByDate: {},
                lastVisit: null,
                reviews: {
                    totalSubmissions: 0,
                    submissionsByDate: {},
                    averageRating: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                }
            };
            
            // Initialize reviews data if it doesn't exist
            if (!analytics.reviews) {
                analytics.reviews = {
                    totalSubmissions: 0,
                    submissionsByDate: {},
                    averageRating: 0,
                    ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                };
            }
            
            // Update review analytics
            analytics.reviews.totalSubmissions = (analytics.reviews.totalSubmissions || 0) + 1;
            analytics.reviews.submissionsByDate[today] = (analytics.reviews.submissionsByDate[today] || 0) + 1;
            
            // Update rating distribution
            const rating = reviewData.rating;
            if (rating >= 1 && rating <= 5) {
                analytics.reviews.ratingDistribution[rating] = (analytics.reviews.ratingDistribution[rating] || 0) + 1;
            }
            
            // Calculate average rating
            const totalRatings = Object.values(analytics.reviews.ratingDistribution).reduce((sum, count) => sum + count, 0);
            if (totalRatings > 0) {
                const weightedSum = Object.entries(analytics.reviews.ratingDistribution)
                    .reduce((sum, [rating, count]) => sum + (parseInt(rating) * count), 0);
                analytics.reviews.averageRating = Math.round((weightedSum / totalRatings) * 10) / 10;
            }
            
            // Update the user document
            await doc.ref.update({
                analytics: analytics,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log(`Review submission tracked for ${businessNumber}. Rating: ${rating}, Total submissions: ${analytics.reviews.totalSubmissions}`);
        } catch (error) {
            console.error('Error tracking review submission:', error);
            throw error;
        }
    }

    // Get analytics data
    async getAnalyticsData(options = {}) {
        try {
            const { timeRange = 30, userId, businessNumber } = options;
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - timeRange);
            
            let query = this.usersCollection.where('status', '==', 'active');
            
            // Filter by specific user if provided
            if (userId) {
                query = query.where(admin.firestore.FieldPath.documentId(), '==', userId);
            } else if (businessNumber) {
                query = query.where('businessNumber', '==', businessNumber);
            }
            
            const snapshot = await query.get();
            const users = [];
            let totalVisits = 0;
            let totalReviews = 0;
            let activeUsers = 0;
            let topPerformingUser = null;
            let maxVisits = 0;
            let totalRatingSum = 0;
            let totalRatingCount = 0;
            
            snapshot.docs.forEach(doc => {
                const userData = doc.data();
                const analytics = userData.analytics || { 
                    totalVisits: 0, 
                    visitsByDate: {}, 
                    lastVisit: null,
                    reviews: {
                        totalSubmissions: 0,
                        submissionsByDate: {},
                        averageRating: 0,
                        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                    }
                };
                
                // Filter visits by date range
                const filteredVisitsByDate = {};
                let userVisitsInRange = 0;
                
                Object.keys(analytics.visitsByDate || {}).forEach(date => {
                    const visitDate = new Date(date);
                    if (visitDate >= cutoffDate) {
                        filteredVisitsByDate[date] = analytics.visitsByDate[date];
                        userVisitsInRange += analytics.visitsByDate[date];
                    }
                });

                // Filter review submissions by date range
                const filteredReviewsByDate = {};
                let userReviewsInRange = 0;
                
                Object.keys(analytics.reviews?.submissionsByDate || {}).forEach(date => {
                    const reviewDate = new Date(date);
                    if (reviewDate >= cutoffDate) {
                        filteredReviewsByDate[date] = analytics.reviews.submissionsByDate[date];
                        userReviewsInRange += analytics.reviews.submissionsByDate[date];
                    }
                });
                
                const userAnalytics = {
                    id: doc.id,
                    name: userData.name,
                    email: userData.email,
                    businessNumber: userData.businessNumber,
                    totalVisits: analytics.totalVisits || 0,
                    visitsInRange: userVisitsInRange,
                    visitsByDate: filteredVisitsByDate,
                    lastVisit: analytics.lastVisit,
                    reviews: {
                        totalSubmissions: analytics.reviews?.totalSubmissions || 0,
                        submissionsInRange: userReviewsInRange,
                        submissionsByDate: filteredReviewsByDate,
                        averageRating: analytics.reviews?.averageRating || 0,
                        ratingDistribution: analytics.reviews?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
                    }
                };
                
                users.push(userAnalytics);
                
                // Calculate summary statistics
                totalVisits += userVisitsInRange;
                totalReviews += userReviewsInRange;
                
                if (userVisitsInRange > 0) {
                    activeUsers++;
                }
                if (userVisitsInRange > maxVisits) {
                    maxVisits = userVisitsInRange;
                    topPerformingUser = userData.name;
                }
                
                // Calculate rating statistics
                if (analytics.reviews?.ratingDistribution) {
                    Object.entries(analytics.reviews.ratingDistribution).forEach(([rating, count]) => {
                        totalRatingSum += parseInt(rating) * count;
                        totalRatingCount += count;
                    });
                }
            });
            
            const summary = {
                totalVisits,
                totalReviews,
                activeUsers,
                avgVisitsPerUser: activeUsers > 0 ? Math.round(totalVisits / activeUsers * 10) / 10 : 0,
                avgRating: totalRatingCount > 0 ? Math.round((totalRatingSum / totalRatingCount) * 10) / 10 : 0,
                topPerformingUser: topPerformingUser || '-'
            };
            
            return {
                users: users.sort((a, b) => b.visitsInRange - a.visitsInRange),
                summary
            };
        } catch (error) {
            console.error('Error getting analytics data:', error);
            throw error;
        }
    }
}

module.exports = new UserService();
