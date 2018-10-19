import { Refreshable } from "src/base";
import { Course, CourseData } from "src/course";
import { HttpClient } from "src/http_client";
import { safe_assign } from "src/utils";

export class UserData {
    pk: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_superuser: boolean;

    constructor({pk,
                 username,
                 first_name,
                 last_name,
                 email,
                 is_superuser}: UserData) {
        this.pk = pk;
        this.username = username;
        this.first_name = first_name;
        this.last_name = last_name;
        this.email = email;
        this.is_superuser = is_superuser;
    }
}

export class User extends UserData implements Refreshable {
    static async get_current(): Promise<User> {
        let response = await HttpClient.get_instance().get<UserData>('/users/current/');
        return new User(response.data);
    }

    static async get_current_user_roles(course_pk: number): Promise<UserRoles> {
        let response = await HttpClient.get_instance().get<UserRoles>(
            `/courses/${course_pk}/my_roles/`);
        return new UserRoles(response.data);
    }

    static async get_by_pk(pk: number): Promise<User> {
        let response = await HttpClient.get_instance().get<UserData>(`/users/${pk}/`);
        return new User(response.data);
    }

    async refresh() {
        let response = await HttpClient.get_instance().get<UserData>(`/users/${this.pk}/`);
        safe_assign(this, response.data);
    }

    async courses_is_admin_for() {
        let response = await HttpClient.get_instance().get<CourseData[]>(
            `/users/${this.pk}/courses_is_admin_for/`);
        return response.data.map(course_data => new Course(course_data));
    }

    async courses_is_staff_for() {
        let response = await HttpClient.get_instance().get<CourseData[]>(
            `/users/${this.pk}/courses_is_staff_for/`);
        return response.data.map(course_data => new Course(course_data));
    }

    async courses_is_student_in() {
        let response = await HttpClient.get_instance().get<CourseData[]>(
            `/users/${this.pk}/courses_is_enrolled_in/`);
        return response.data.map(course_data => new Course(course_data));
    }

    async courses_is_handgrader_for() {
        let response = await HttpClient.get_instance().get<CourseData[]>(
            `/users/${this.pk}/courses_is_handgrader_for/`);
        return response.data.map(course_data => new Course(course_data));
    }
}

export class UserRoles {
    is_admin: boolean;
    is_staff: boolean;
    is_student: boolean;
    is_handgrader: boolean;

    constructor({
        is_admin,
        is_staff,
        is_student,
        is_handgrader
    }: UserRoles) {
        this.is_admin = is_admin;
        this.is_staff = is_staff;
        this.is_student = is_student;
        this.is_handgrader = is_handgrader;
    }
}
