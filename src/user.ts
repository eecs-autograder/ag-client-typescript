import { ID, Refreshable } from "./base";
import { Course, CourseData } from "./course";
import { Group, GroupData } from "./group";
import { GroupInvitation, GroupInvitationData } from "./group_invitation";
import { HttpClient } from "./http_client";
import { safe_assign } from "./utils";

export class UserData {
    pk: number;
    username: string;
    first_name: string;
    last_name: string;
    is_superuser: boolean;

    constructor({pk,
                 username,
                 first_name,
                 last_name,
                 is_superuser}: UserData) {
        this.pk = pk;
        this.username = username;
        this.first_name = first_name;
        this.last_name = last_name;
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

    static async current_can_create_courses(): Promise<boolean> {
        let response = await HttpClient.get_instance().get<boolean>(
            '/users/current/can_create_courses/');
        return response.data;
    }

    static async get_by_pk(pk: number): Promise<User> {
        let response = await HttpClient.get_instance().get<UserData>(`/users/${pk}/`);
        return new User(response.data);
    }

    async refresh(): Promise<void> {
        let response = await HttpClient.get_instance().get<UserData>(`/users/${this.pk}/`);
        safe_assign(this, response.data);
    }

    async courses_is_admin_for(): Promise<Course[]> {
        let response = await HttpClient.get_instance().get<CourseData[]>(
            `/users/${this.pk}/courses_is_admin_for/`);
        return response.data.map(course_data => new Course(course_data));
    }

    async courses_is_staff_for(): Promise<Course[]> {
        let response = await HttpClient.get_instance().get<CourseData[]>(
            `/users/${this.pk}/courses_is_staff_for/`);
        return response.data.map(course_data => new Course(course_data));
    }

    async courses_is_student_in(): Promise<Course[]> {
        let response = await HttpClient.get_instance().get<CourseData[]>(
            `/users/${this.pk}/courses_is_enrolled_in/`);
        return response.data.map(course_data => new Course(course_data));
    }

    async courses_is_handgrader_for(): Promise<Course[]> {
        let response = await HttpClient.get_instance().get<CourseData[]>(
            `/users/${this.pk}/courses_is_handgrader_for/`);
        return response.data.map(course_data => new Course(course_data));
    }

    async groups_is_member_of(): Promise<Group[]> {
        let response = await HttpClient.get_instance().get<GroupData[]>(
            `/users/${this.pk}/groups_is_member_of/`);
        return response.data.map(data => new Group(data));
    }

    async group_invitations_sent(): Promise<GroupInvitation[]> {
        let response = await HttpClient.get_instance().get<GroupInvitationData[]>(
            `/users/${this.pk}/group_invitations_sent/`);
        return response.data.map(data => new GroupInvitation(data));
    }

    async group_invitations_received(): Promise<GroupInvitation[]> {
        let response = await HttpClient.get_instance().get<GroupInvitationData[]>(
            `/users/${this.pk}/group_invitations_received/`);
        return response.data.map(data => new GroupInvitation(data));
    }

    static async get_num_late_days(
        course_pk: ID, username_or_pk: string | ID
    ): Promise<LateDaysRemaining> {
        let response = await HttpClient.get_instance().get<LateDaysRemaining>(
            `/users/${username_or_pk}/late_days/?course_pk=${course_pk}`);
        return response.data;
    }

    static async set_num_late_days(
        course_pk: ID, username_or_pk: string | ID, num_late_days: number
    ): Promise<LateDaysRemaining> {
        let response = await HttpClient.get_instance().put<LateDaysRemaining>(
            `/users/${username_or_pk}/late_days/?course_pk=${course_pk}`,
            {late_days_remaining: num_late_days});
        return response.data;
    }
}

interface LateDaysRemaining {
    late_days_remaining: number;
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
